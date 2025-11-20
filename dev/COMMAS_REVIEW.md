# Comma Enumeration Review

_Updated: 2025-11-20_

## Current Implementation Summary

The comma catalog (see `src/theory/commas.js`) enumerates exponent vectors over the chosen prime set:

1. **Grid search** – For `n` primes and exponent bound `E`, the code iterates over the integer hypercube `[-E, E]^n` using a simple depth-first stack. The all-zero vector is skipped.
2. **Primitive normalization** – Each candidate monzo is reduced to a primitive representative (`normalizePrimitiveMonzo`) to remove common factors.
3. **Orientation by cents** – `centsFromMonzo` is used to orient the comma so that its cents value is non-negative. Ratios with cents magnitude above the `maxCents` cut-off are discarded.
4. **De-duplication** – A hash set on the normalized monzo string prevents duplicates that arise because different exponent tuples reduce to the same primitive comma.
5. **Batching & sorting** – The async variant chunks work via `setTimeout`, emits progress percentages, and finally sorts the accumulated commas by cents/L₁ magnitude for stable UI presentation.

This approach balances simplicity and responsiveness; it integrates well with the UI’s progress bar and cancellation button.

## Strengths

- **Deterministic coverage**: The full hypercube enumeration guarantees no comma is missed within the configured bounds.
- **Streaming-friendly**: Chunked traversal plus `onBatch` callbacks keep the UI responsive even for millions of states.
- **Normalization-first**: Primitive reduction and cents orientation ensure the catalog is clean and deduplicated without extra post-processing.

## Observed Limitations

1. **Exponential growth** – The search space scales as `(2E+1)^n - 1`; even moderate bounds (e.g., `E=7`, `n=5`) explode into tens of millions of states.
2. **naïve bounding** – Using the same `E` for every prime ignores that higher primes generally need smaller exponents. Musically relevant commas usually live in a much smaller polytope than the axis-aligned cube.
3. **No structural pruning** – Apart from the cents cut-off, there’s no arithmetic pruning (e.g., checking that the comma vector lies in the kernel of mod-`m` projections or using small common-factor filters before expensive monzo normalization/hermitian calculations).
4. **Redundant computations** – `normalizePrimitiveMonzo` + `centsFromMonzo` are applied to every candidate even if early checks (e.g., odd-limit or norm bounds) could disqualify many vectors before expensive math.
5. **Single-threaded** – Like the pump search, enumeration happens on the main thread. Large runs can still monopolize UI time despite chunking.

## Recommended Improvements

### 1. Polytope / Norm-Based Pre-Pruning

Instead of enumerating the entire cube, bound the search by a norm constraint derived from cents. Since `cents ≈ 1200·log₂(∏ pᵢ^{eᵢ})`, we can rearrange to constrain `∑ eᵢ·log₂(pᵢ)` and prune branches whose running sum already exceeds `maxCents`. A branch-and-bound DFS would prune huge portions of the space early.

### 2. Meet-in-the-Middle with Hashing

Split the prime set into two subsets. Enumerate partial monzos for each half up to a certain cents (or log-ratio) threshold, then combine matching halves whose cents fall within bounds. This reduces depth and enables parallel exploration of each half.

### 3. Smith Normal Form Filtering

Compute the SNF of the prime subgroup’s monzo lattice once. Many exponent combinations correspond to the same comma class modulo the subgroup’s relations. Using SNF to work directly in the quotient lattice would reduce enumeration to truly distinct classes.

### 4. Prime-Specific Bounds

Derive per-prime exponent limits from the cents constraint: `|eᵢ| ≤ maxCents / (1200·log₂(pᵢ))`. This keeps high primes from consuming the axis-aligned budget and dramatically shrinks the search when large primes are present.

### 5. Worker Offload & Metrics

Move the enumeration loop into a Web Worker, mirroring the long-term plan for pumps. Instrument the worker to emit metrics (states skipped, max depth encountered, dedup ratio) so we can empirically tune heuristics.

### 6. Caching & Incremental Updates

When users tweak `maxCents` or exponent bounds slightly, reuse the previously enumerated set and apply incremental filters instead of restarting the entire traversal. A simple memoized cache keyed by `(primes, expBound)` could feed a fast post-filter for cents.

## Suggested Next Steps

1. Implement per-prime theoretical bounds and branch pruning (recommend starting here; it’s a small change with large wins).
2. Prototype a worker-backed enumerator so UI responsiveness is guaranteed regardless of search size.
3. Explore SNF or other lattice-reduction approaches in parallel; even partial reductions (e.g., factoring out the 2/3 lattice for 5-limit commas) could eliminate huge regions of duplicate work.
4. Once instrumentation is in place, gather stats from real users to guide more aggressive heuristics (e.g., meet-in-the-middle thresholds, cents-based pruning).

These improvements will keep comma discovery fast and scalable as users explore larger prime subgroups or tighter cents limits.
