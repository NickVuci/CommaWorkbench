# Comma Workbench — Improvements

This document tracks quick wins and larger enhancements. Ordered roughly by cost/benefit.

## 1) Validate subgroup input and extend prime base
- Effort: Small
- Impact: High
- Details:
  - Validate comma-separated input contains primes; reject or filter composites and <2.
  - When a single number is provided (prime limit), generate all primes ≤ limit (via sieve), not just a fixed base up to 31.
- Status: Implemented.

## 2) Guards/progress for heavy searches
- Effort: Small
- Impact: High
- Details: Disable Run/Pumps while searching; show busy indicator; catch long runs.
- Status: Todo.

## 3) Wire “Sort pumps by” selector
- Effort: Small
- Impact: Medium
- Details: Toggle between L1 and lexicographic ordering of solutions.
- Status: Todo.

## 4) Persist UI state in URL
- Effort: Small–Medium
- Impact: Medium
- Details: Read/write settings to query params; support shareable links.
- Status: Todo.

## 5) JSDoc types + more unit tests
- Effort: Medium
- Impact: Medium–High
- Details: Type core/theory modules with JSDoc; add tests for edge cases.
- Status: Todo.

## 6) Web Worker for heavy search
- Effort: Medium–Large
- Impact: High
- Details: Offload pump enumeration / comma scan to a worker for smooth UI.
- Status: Todo.
