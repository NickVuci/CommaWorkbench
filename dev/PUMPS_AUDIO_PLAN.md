# Pump Audio + Visualization Plan

_Updated: 2025-11-20_

## 1. Goals & Scenarios
- **Preview a pump audibly**: let users hear a comma pump by sequencing the selected steps as just-intoned intervals around a user-set base pitch.
- **Compare tuning contexts**: offer toggles for JI playback (exact monzo ratios) versus the currently selected EDO approximation (quantize to `selectedEdo`), so users can hear the tempered drift.
- **Show stacked intervals**: when a pump row is highlighted, display the cumulative pitch path (spiral staircase) for both tunings with visual cues for comma closure.
- **Capture exploratory notes in a branch**: all work will happen on an experimental branch so the main UI stays stable.

## 2. Proposed User Flow
1. User runs Steps 1–4 as today and gets a pump list.
2. Each pump row gains a "Preview" icon; clicking it selects the pump, reveals a side panel, and starts playback.
3. The side panel contains:
   - Base pitch selector (A4, Hz input, or note picker) with quick presets.
   - Toggle chips: `JI` and `Selected EDO` (disabled if no EDO is picked in Step 2).
   - "Stack view" rendering: timeline/spiral chart showing cumulative cents for each step coefficient.
   - Transport controls (Play/Pause/Loop).
4. While previewing, the associated steps chip row in Step 3 should highlight the coefficients being traversed (animate magnitude and sign).
5. Stopping playback collapses the panel back to its compact state.

## 3. Audio Architecture (Web Audio API)
- **Engine module**: add `src/audio/pumpPreview.js` exporting `schedulePumpPlayback(pump, steps, options)`.
- **Source strategy**: use a single `OscillatorNode` with gain envelopes per note, or polyphonic `OscillatorNode` per chord if we ever support stacked sonorities. Initial MVP: monophonic gliss-free jumps with short crossfades.
- **Pitch computation**:
  - `ratioFromStep(step)` already exists; convert to cents via `step.cents` for JI path.
  - For EDO playback, snap each cumulative position to the nearest `selectedEdo` step: `round(cents / (1200/edo)) * (1200/edo)`.
  - Maintain both sequences so UI can swap instantly without recomputing scheduling.
- **Scheduling**:
  - Use `AudioContext.currentTime` plus fixed `noteDuration` (e.g., 0.6 s) and `releaseTime` (0.1 s) to avoid pops.
  - Queue all events ahead but keep a `playhead` to support pause/resume.
  - Include a loop flag to replay automatically for pumps ≤ ~8 steps.
- **Safety**: lazy-init the `AudioContext` on first play button click to satisfy browser gesture requirements; expose a `stopAll()` that UI calls on navigation or when running new searches.

## 4. Visualization Stack
- **Data**: for each pump, compute cumulative offsets `cum[i] = Σ stepCoeff[j]*step.cents`. Track both JI and EDO series.
- **UI**: add `src/ui/pumpPreviewPanel.js` that renders:
  - Polyline chart (SVG or canvas) with two paths (JI vs EDO). The vertical axis = cents, horizontal = step index.
  - Step markers with labels like `+2·M3` reflecting coefficients as the walk progresses.
  - Closing gap annotation showing comma magnitude at the end.
- **Interaction**: hover a point to read exact ratio/frequency; active playback step is emphasized (pulsing dot) via `requestAnimationFrame` updates tied to the audio scheduler.

## 5. State & Integration Points
- Extend `renderPumpTable` to set `data-index` per row and emit a `pumpPreviewRequested` custom event with `{ pumpIndex }`.
- Track `selectedPumpIndex` in `src/main.js`, alongside `selectedCommaIndex`.
- Selected EDO already lives in `selectedEdo`; reuse it for EDO playback toggle enablement.
- Add lightweight Redux-like store? Probably overkill; keep state in `main.js` and pass references down to new UI modules.
- Provide graceful fallbacks: if no EDO is selected, default to JI only; disable preview entirely if Web Audio isn’t supported.

## 6. Incremental Implementation Plan
1. **Scaffold branch** `feature/pump-audio-preview` and add placeholder panel with static copy & fake chart.
2. **Event wiring**: pump table row emits selection events; preview panel shows chosen coefficients and data.
3. **Computation helpers**: add utilities for `buildPumpWalk(pump, steps)` returning cumulative cents + ratios + durations.
4. **Visualization MVP**: render simple table or sparkline before full SVG chart.
5. **Audio MVP**: implement JI playback with sine oscillator, play/pause, and base pitch selector.
6. **EDO toggle**: integrate quantization path and allow realtime switching.
7. **UI polish**: highlight chips, add loop control, integrate progress indicator.
8. **Testing**: extend `runSelfTests` with unit tests for the pump-walk math (no audio). Manual QA for audio/visual sync.

## 7. Open Questions / Risks
- **Tempo & feel**: Should playback be metered (fixed duration per coefficient) or proportional to |coeff| (longer duration for repeated steps)?
- **Chordal playback**: Do we ever want to hear stacked intervals simultaneously, or is serial walking sufficient?
- **EDO availability**: If no EDO is selected yet, should we default to best-fit from Step 2, or force user to choose?
- **Accessibility**: Need to ensure audio controls are keyboard-friendly and chart has descriptive text for screen readers.
- **Performance**: Web Audio scheduling plus SVG animations must stay responsive even while pump search runs; might need to throttle or pause playback during heavy computation.

This plan keeps experimentation isolated, clarifies UX surfaces, and outlines both audio and visualization architecture so the branch can evolve without destabilizing the core workflow.
