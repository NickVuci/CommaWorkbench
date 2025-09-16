# Pump Search Performance & Safety

This note collects options to make pump enumeration (solving S·x = c) faster and safer (no UI lockups), with effort/impact and a suggested rollout path.

## Context
- Current approach: meet-in-the-middle over coefficient bounds in [-B..B] for k steps, dedup, verify, sort by L1.
- Complexity: roughly O((2B+1)^(k/2)) time and memory.
- Goal: keep UI responsive, avoid runaway searches, and return useful results quickly.


## Current implementation status (Sept 2025)

- Low‑cost safeguards
  - GCD feasibility pre-check — Done (row-wise early bail)
  - Max solutions cap — Done (Top‑K capped at 200)
  - Time budget — Done (configurable; UI uses ~3000 ms)
  - Chunked yielding — Done (~12 ms slices; setTimeout + performance.now)
  - Cancel support — Done (inline progress Cancel button)
  - Iterative deepening — Done (B increases ring-by-ring)
  - Pre-run estimate & confirmation — Done (pumps and commas)
  - Clear partial/capped labels — Done (status text reflects partial/capped/cancelled)

- Performance optimizations
  - Step ordering heuristic — Done (|dot(s,c)| / ||s||₁)
  - Branch-and-bound (per-dim reach) — Partial (initial reach bail at Bmax; in-search pruning Pending)
  - Deduplicate/compress during MITM — Partial (solution dedup; right-half stored but not minimized to lowest‑L1 per key yet)
  - Maintain Top‑K to prune — Partial (cap maintained; dynamic L1 cutoff pruning Pending)
  - Remove trivial/duplicate columns — Planned
  - MITM micro-optimizations (typed arrays, compact keys) — Planned

- Bigger wins
  - Web Worker offload — Planned
  - Rank reduction of step matrix — Planned

- Optional extras
  - LRU cache of recent queries — Planned
  - Perf harness & smoke tests — Planned

---

## Immediate operational tweaks (no code)
- Fewer steps selected (3–5)
  - Effort: None; Impact: High; Risk: Low
- Lower coefficient bound (start at 3–4)
  - Effort: None; Impact: High; Risk: Low
- Prefer smaller/“simpler” steps (shorter monzo/L1; small cents)
  - Effort: None; Impact: Medium; Risk: Low
- Only run pumps for target commas
  - Effort: None; Impact: Medium; Risk: Low

---

## Low‑cost safeguards (recommended)
0) Cheap feasibility pre-check (row GCD)
- Effort: Small; Impact: High; Risk: Low
- Notes: For each row i of S, compute g_i = gcd(S_i,1..S_i,k). If g_i == 0 then require c_i == 0; else require c_i % g_i == 0. If not, the system is unsatisfiable—bail out instantly. Optionally divide row and c_i by g_i to reduce magnitudes before search.

1) Max solutions cap (e.g., 200–500)
- Effort: Small; Impact: High; Risk: Low
- Notes: Stop upon reaching cap; show “capped at N.”

2) Time budget (e.g., 1500–2000 ms)
- Effort: Small; Impact: High; Risk: Low
- Notes: Stop and return partial results; show elapsed time and “partial.”

3) Chunked yielding (time slicing)
- Effort: Small; Impact: High; Risk: Low
- Notes: Process in small chunks and yield (requestIdleCallback when available; fallback to setTimeout 0) every ~10–15 ms so the progress UI remains responsive. Use performance.now() to bound per-chunk time. Always check a cancel flag between chunks.

4) Cancel support
- Effort: Small–Medium; Impact: High; Risk: Low
- Notes: Add a cancel button/flag checked between chunks to abort long searches.

5) Iterative deepening on bounds
- Effort: Small; Impact: Medium–High; Risk: Low
- Notes: Increase coefficient bound B progressively (e.g., 2 → 3 → 4 …) and/or total L1 radius. Yield after each ring. This surfaces simple/best pumps first and ensures early partials are useful.

6) Pre-run cost estimate and confirmation
- Effort: Small; Impact: Medium; Risk: Low
- Notes: Estimate work ~ (2B+1)^(k/2) for MITM or via a simple calibrated model. If it exceeds a threshold, show an approximate time and require user confirmation before starting. Offer a “Run anyway” and “Adjust parameters” option.

7) Clear partial/capped result labeling
- Effort: Small; Impact: Medium; Risk: Low
- Notes: Tag results with “partial after T ms” and/or “capped at N.” Keep results sorted by L1 so the most useful remain on top.

---

## Performance optimizations (algorithmic tweaks)
1) Step ordering for pruning (concrete)
- Effort: Small–Medium; Impact: Medium–High; Risk: Low
- Idea: Sort steps by descending usefulness using a concrete heuristic, e.g., score(s_j) = |dot(s_j, c)| / (||s_j||_1 + ε). Tie-break by smaller ||s_j||_1. This aligns impactful steps early and improves pruning.

2) Branch‑and‑bound
- Effort: Medium; Impact: High; Risk: Medium
- Idea: Maintain a bound on remaining reachable monzo across remaining steps; prune branches that cannot reach the needed vector.

2a) Per-dimension reach bound (simple BnB)
- Effort: Small; Impact: Medium–High; Risk: Low
- Idea: Precompute per-dimension R_i = Σ_j |S_i,j| · B. During partial enumeration with current monzo m, if |c_i − m_i| > R_i(remaining) for any i, prune immediately. Also, if initially any |c_i| > R_i(total), bail early.

3) Deduplicate/compress during MITM
- Effort: Medium; Impact: Medium; Risk: Low
- Idea: For each right‑half monzo key, store only the best (lowest L1) coefficients; use typed arrays and compact keys to reduce memory.

4) Maintain Top‑K best to prune
- Effort: Small–Medium; Impact: Medium–High; Risk: Low
- Idea: Keep a fixed-size container (e.g., K = maxSolutions) storing best solutions by L1. When full, use the worst L1 in Top‑K as a dynamic cutoff to prune worse partials.

5) Remove trivial/duplicate columns up front
- Effort: Small; Impact: Medium; Risk: Low
- Idea: Drop zero columns and exact duplicate columns before search (track mapping to reconstruct solutions). This is a cheap subset of rank reduction that shrinks the search.

6) MITM micro-optimizations
- Effort: Small–Medium; Impact: Medium; Risk: Low
- Ideas:
  - Right-half compression: for each monzo key, store only the best coefficient vector by L1; use compact string or small hash key with collision check.
  - Use typed arrays (Int16/Int32) for coefficient vectors and monzos to reduce GC overhead.
  - Optionally cap right-map entries and switch to streaming mode with a warning when approaching memory limits.

---

## Bigger wins
1) Web Worker (time‑sliced worker)
- Effort: Medium–Large; Impact: High; Risk: Low–Medium
- Notes: Offload enumeration; post progress/partial results periodically; UI remains smooth regardless of search size.

2) Rank reduction of the step matrix
- Effort: Medium; Impact: Medium; Risk: Medium
- Notes: Detect and drop linearly dependent steps up front (reduce k) to shrink the search space.

---

## Advanced options
1) Integer linear algebra (SNF/HNF) solution basis
- Effort: High; Impact: High; Risk: Medium–High
- Notes: Compute a basis of integer solutions to S·x = c, then enumerate bounded combinations (by L1 or coefficient bound). Replaces brute‑force search but requires more math and careful bounding.

---

## Suggested path forward (roadmap)
1) Implement safeguards (fast)
- Add maxSolutions = 200 (configurable)
- Add timeBudgetMs = 1500 (configurable)
- Implement GCD feasibility pre-check and per-dimension reach bound (early bail/prune)
- Implement chunking with yields every ~10–15 ms and check cancel flag
- Add cancel button to the inline progress UI (overlay removed)
- Add iterative deepening (B and/or L1) so simpler/better pumps arrive first
- Add pre-run cost estimate and confirmation for oversized runs
- Ensure clear labeling for partial/capped results

2) Improve pruning
- Order steps heuristically using the |dot|/||·||_1 scoring
- Add per-dimension reach bound pruning and maintain a Top‑K best for dynamic L1 cutoff
- Remove zero/duplicate columns up front (lightweight rank reduction)

3) Move to a Web Worker
- Port enumeration to a worker with progress messages and cancellation
- Keep UI code unchanged aside from message handling

4) Optional extras
- Rank reduction before search
- Typed arrays and compressed keying for MITM maps
- Lightweight LRU cache for recent queries (small, e.g., 5–10 entries)
- Add a tiny perf harness and smoke tests for pruning, caps, and cancellation

5) Long‑term advanced
- Explore SNF/HNF approach if needed for large k/B

---

## UI/UX guarantees (mapping to features)

The plan above will deliver the following user-facing guarantees:

- Users can stop the search
  - Cancel button sets a cancel flag checked between time-sliced chunks (both in main thread and worker). Search aborts promptly; inline progress UI remains responsive.

- Users always see some results
  - Time slicing yields partial results periodically. Caps and time budgets return the best-so-far, clearly labeled as partial/capped, sorted by L1.

- Users see an approximate time required
  - Pre-run cost estimate based on (2B+1)^(k/2) and heuristic calibration produces an ETA range. Displayed before start; updated with live throughput during the run.

- Users can confirm before running exceedingly large searches
  - If the pre-run estimate exceeds a threshold, show a confirmation dialog with ETA and parameter summary; provide “Run anyway”, “Adjust parameters”, and “Cancel”.

- Searches prioritize best and unique results first
  - Iterative deepening (B and/or L1) surfaces simpler solutions early. Step ordering and Top‑K pruning bias toward lower L1. MITM right-half compression dedups and retains best per key.

- Users see visual progress
  - A progress bar/percent based on known work items (e.g., number of left-half keys processed vs. total) and/or live node count vs. estimated total. Periodic progress messages from worker update the UI smoothly.

Acceptance notes
- UI remains responsive thanks to time slicing (and future worker offload).
- Partial and capped results are clearly labeled and sorted.
- Cancel instantly stops further work and leaves UI consistent.
- ETA shown pre-run with confirmation on oversized searches; updated during run.

---

## Success criteria
- UI remains responsive (inline progress UI remains interactive) for all runs.
- Typical pump queries finish under ~1–2 seconds with reasonable defaults (k ≤ 5, B ≤ 6).
- Cancellation works and leaves the app in a good state.
- Partial results are clearly labeled and still useful (sorted, deduped).
- Users see an ETA and can confirm or abort if the run is projected to be large.
- Results are prioritized toward best/simplest first via iterative deepening and pruning.
- Visual progress indicator reflects processed work vs. total estimate.

---

## Near-term next steps (to complete Partial items)

- Add per-branch pruning using remaining per-dimension reach during left/right recursion (simple BnB).
- Use current Top‑K worst L1 as a dynamic cutoff to prune branches guaranteed to exceed it.
- Compress right-half map to keep only lowest‑L1 coeffs per monzo key (memory + speed).
- Consider typed arrays for monzos/coeffs and compact keying to reduce GC pressure.
