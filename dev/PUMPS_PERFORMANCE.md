# Pump Search Performance & Safety

This note collects options to make pump enumeration (solving S·x = c) faster and safer (no UI lockups), with effort/impact and a suggested rollout path.

## Context
- Current approach: meet-in-the-middle over coefficient bounds in [-B..B] for k steps, dedup, verify, sort by L1.
- Complexity: roughly O((2B+1)^(k/2)) time and memory.
- Goal: keep UI responsive, avoid runaway searches, and return useful results quickly.

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
1) Max solutions cap (e.g., 200–500)
- Effort: Small; Impact: High; Risk: Low
- Notes: Stop upon reaching cap; show “capped at N.”

2) Time budget (e.g., 1500–2000 ms)
- Effort: Small; Impact: High; Risk: Low
- Notes: Stop and return partial results; show elapsed time and “partial.”

3) Chunked yielding (time slicing)
- Effort: Small; Impact: High; Risk: Low
- Notes: Process in small chunks and yield (setTimeout 0 or requestIdleCallback) every ~10–20 ms so the overlay paints and the UI stays responsive.

4) Cancel support
- Effort: Small–Medium; Impact: High; Risk: Low
- Notes: Add a cancel button/flag checked between chunks to abort long searches.

---

## Performance optimizations (algorithmic tweaks)
1) Step ordering for pruning
- Effort: Small–Medium; Impact: Medium–High; Risk: Low
- Idea: Sort steps by descending usefulness (e.g., alignment with comma or monzo norm) to prune earlier.

2) Branch‑and‑bound
- Effort: Medium; Impact: High; Risk: Medium
- Idea: Maintain a bound on remaining reachable monzo across remaining steps; prune branches that cannot reach the needed vector.

3) Deduplicate/compress during MITM
- Effort: Medium; Impact: Medium; Risk: Low
- Idea: For each right‑half monzo key, store only the best (lowest L1) coefficients; use typed arrays and compact keys to reduce memory.

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
- Implement chunking with yields every ~10–20 ms
- Add cancel button to the busy overlay

2) Improve pruning
- Order steps heuristically (e.g., by |projection onto comma| or monzo norm)
- Add a simple branch‑and‑bound check using per‑prime remaining reach bounds

3) Move to a Web Worker
- Port enumeration to a worker with progress messages and cancellation
- Keep UI code unchanged aside from message handling

4) Optional extras
- Rank reduction before search
- Typed arrays and compressed keying for MITM maps

5) Long‑term advanced
- Explore SNF/HNF approach if needed for large k/B

---

## Success criteria
- UI remains responsive (overlay visible) for all runs.
- Typical pump queries finish under ~1–2 seconds with reasonable defaults (k ≤ 5, B ≤ 6).
- Cancellation works and leaves the app in a good state.
- Partial results are clearly labeled and still useful (sorted, deduped).
