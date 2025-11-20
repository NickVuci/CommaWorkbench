# Comma Pump Search Review

_Updated: 2025-11-20_

## Current Implementation Summary

The pump finder (`src/theory/pumps.js`) builds a meet-in-the-middle (MITM) search over bounded integer coefficients:

1. **Step ordering** – Steps are sorted by `|dot(step, comma)| / ||step||₁` to prioritize directions that influence the target comma most strongly.
2. **Iterative deepening over coefficient bound (B)** – The algorithm starts at a low `B` and increases until it reaches the requested `coeffBound`.
3. **Half-split MITM** – Steps are divided into left/right halves. Each half enumerates all coefficient vectors in `[-B, B]` using depth-first traversal with chunked yielding. Partial sums are stored in hash maps keyed by resulting monzos.
4. **Match & verification** – When complementary halves sum to the target comma, solutions are re-ordered back into the user’s original step ordering, deduplicated by `l1`, and returned incrementally via callbacks.
5. **Post-processing** – The UI optionally canonicalizes pumps (integer-kernel reduction) after enumeration.

This approach is straightforward and integrates well with the UI’s chunked progress reporting and cancellation controls.

## Strengths

- **Streaming + cancellable**: The enumerator yields batches and honors cancellation, which keeps the UI responsive.
- **Deterministic ordering**: Solutions are sorted by `L1`, producing predictable output for the “shortest pumps first” experience.
- **Lightweight dependencies**: Pure JS implementation with no native bindings, so it runs anywhere the UI does.

## Observed Limitations

1. **Exponential search despite structure** – Even with MITM, the search space is `(2B+1)^{k}`; the code does not exploit the lattice structure of `S·x = c` beyond simple row-GCD feasibility tests.
2. **Redundant verification** – Each potential match recomputes `applySteps` even though the partial sums already equal the comma by construction. This doubles some work.
3. **Heuristic step ordering only** – The current scoring is a crude ratio; it does not consider linear dependence or conditioning, so poorly conditioned step sets still explode combinatorially.
4. **No nullspace guidance** – The canonicalizer knows the integer kernel after the fact, but the searcher does not use it to prune equivalent solutions or reduce dimension.
5. **Single-threaded** – Large searches monopolize the main thread (even with chunking) and can stall UI interactions on slower hardware.

## Recommended Improvements

### 1. Lattice/SNF-Based Solver

Compute a Smith Normal Form (SNF) or integer row-reduced form of the step matrix `S`. This yields:

- A **particular solution** `x₀` such that `S·x₀ = c` (if one exists).
- An **integer basis** `{k₁…kᵣ}` for the nullspace (`S·kᵢ = 0`).

Every solution can be written as `x = x₀ + Σ tᵢ·kᵢ`. The search then reduces to finding small integer combinations of the kernel basis. Benefits:

- Dimension drops from `k` to `r = k - rank(S)`.
- The search becomes a shortest vector problem (SVP) in a considerably smaller lattice, enabling use of LLL / BKZ or bounded enumeration algorithms from computational number theory.
- Many infeasible configurations are rejected earlier by SNF rather than MITM reach checks.

Implementation sketch:

1. Use existing `integerNullspace` (already in `ui/pumpTable.js`) or extend it to return a full SNF decomposition (`U·S·V = diag(d₁…d_r)`).
2. Once `x₀` is known, run a depth-first or best-first enumeration over `t` vectors with the lattice metric induced by `||x||₁`.
3. Canonicalization becomes intrinsic because solutions are generated as combinations of kernel vectors.

### 2. Branch-and-Bound with Stronger Heuristics

If keeping the MITM approach:

- Adopt **branch-and-bound**: maintain a running `L1` bound and prune any partial assignment whose optimistic lower bound already exceeds the best found solution.
- Replace the current `orderStepsWithIndex` heuristic with a **column-pivoted QR** or **rank-revealing** ordering to reduce conditioning issues.
- Cache `perDimReach` per partial depth so reach checks become dynamic rather than relying solely on `Bmax`.

### 3. Incremental Nullspace Projection

Integrate the kernel basis during enumeration:

- After picking coefficients for half of the steps, immediately reduce them modulo the kernel basis to avoid exploring equivalent states.
- Maintain canonical representatives in the MITM hash maps (`key = reduced monzo`). This shrinks both maps and reduces duplicate matches.

### 4. Parallel / Worker Execution

Long searches should run inside a Web Worker:

- The existing chunked callbacks map cleanly to `postMessage` events.
- Workers keep the UI responsive and allow future SIMD or WASM acceleration without touching the UI thread.

### 5. Smarter Result Ranking

Consider ranking by **energy** (quadratic form derived from `SᵀS`) or by **frequency of step usage** to emphasize musically meaningful pumps rather than purely minimal `L1`. This requires no algorithmic change but improves perceived quality.

## Suggested Next Steps

1. Prototype an SNF-driven solver on a few known pump cases and compare runtime vs. the current MITM enumerator.
2. Extract the integer-kernel utilities out of `ui/pumpTable.js` into a shared module so the solver can reuse them.
3. Add instrumentation (counts of states explored, hash sizes) to the existing enumerator to capture real-world workloads; this data will inform whether heuristic improvements are sufficient before a full rewrite.
4. If performance remains an issue, migrate the heavy computation into a Web Worker and gate experimental solvers behind a feature flag in the UI.

Adopting even one of these changes (especially the lattice-based approach) should dramatically reduce the search space for large coefficient bounds while also simplifying the canonicalization pipeline.
