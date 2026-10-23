# CubeSense - Speedcubing Studio & Algorithm Suite

## Overview
CubeSense is a modern, high-performance speedcubing platform featuring a WCA-compliant smart timer, audio cues, real-time statistics, 2D scramble verification, and the complete CFOP algorithm suite (all 41 F2L, 57 OLL, and 21 PLL cases) with a dedicated Algorithm Practice Studio.

## Key Features & Capabilities

### 1. Complete CFOP Algorithm Suite (119 Cases)
- **Full 41 F2L Cases**: Basic inserts, corner in U / edge in U, corner white facing up, and pieces in slot with FR targeting and trigger breakdowns.
- **Full 57 OLL Cases**: All Dot cases, All Edges Oriented (OCLL), Small/Big Lightning Bolts, Fish shapes, Knight moves, Awkward shapes, P-shapes, T-shapes, C-shapes, W-shapes, L-shapes, and I-shapes with 3x3 yellow facelets and orientation bars.
- **Full 21 PLL Cases**: All corner permutations (Aa, Ab, E), edge permutations (Ua, Ub, H, Z), and adjacent/diagonal swaps (T, F, Ja, Jb, Ra, Rb, G-perms, V, Y, Na, Nb) with permutation cycle arrows.
- **2-Look Subsets**: Dedicated filters for 2-Look OLL (7 cases) and 2-Look PLL (6 cases) for beginner/intermediate speedcubers.

### 2. Dedicated Algorithm Practice Studio (`AlgoTrainer.jsx`)
- **Speed Drill Mode**:
  - Automatically calculates the exact **inverted setup scramble** for physical cube drilling.
  - Built-in execution timer (spacebar hold-to-ready and release-to-drill).
  - Personal Best (PB) tracker per algorithm stored locally.
  - Session average and rep counter.
  - "Peek Formula" toggle to test recognition and muscle memory.
  - Keyboard navigation (`Space` = timer, `N` = next, `P` = previous, `H` = peek).
- **Flashcard Recognition Mode**:
  - Displays only the diagram; solvers identify the correct case from 4 options.
  - Tracks recognition score and accuracy percentage.
- **Complete Library & Cheat Sheet**:
  - Instant live search by name, notation, or triggers.
  - One-click copy for notations and setup scrambles.
  - Favorite bookmarking system.

### 3. WCA Smart Timer
- **WCA Inspection (15s)**: Audible chimes at 8s and 12s, with automatic +2 and DNF regulation logic.
- **High-Precision Timing**: Microsecond performance via `requestAnimationFrame`.
- **Keyboard & Touchpad Controls**: Spacebar hold-to-start timing and on-screen dual touchpads for mobile and touchscreen devices.
- **Audio Synthesizer**: 100% offline oscillator audio (start beeps, stop chimes, PB fanfare).

### 4. Project Structure
```text
CubeSense/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── components/
│   │   ├── SmartTimer.jsx
│   │   ├── AlgoTrainer.jsx        (New dedicated Practice Studio)
│   │   ├── AlgoTeacher.jsx        (Complete CFOP Reference)
│   │   ├── AlgoVisualizer.jsx     (Universal F2L, OLL, PLL SVG visualizer)
│   │   ├── CubeNetVisualizer.jsx  (2D Scramble verification net)
│   │   ├── AuthPanel.jsx
│   │   └── layout/
│   │       ├── Sidebar.jsx
│   │       ├── SolveHistoryPanel.jsx
│   │       ├── SessionTrendChart.jsx
│   │       └── SolveDetailModal.jsx
│   ├── data/
│   │   ├── algorithms.js          (Master export & lookup)
│   │   ├── f2lAlgorithms.js       (41 standard F2L cases)
│   │   ├── ollAlgorithms.js       (57 standard OLL cases)
│   │   └── pllAlgorithms.js       (21 standard PLL cases)
│   └── utils/
│       ├── cubeSimulator.js       (Virtual cube simulation & algorithm inverter)
│       ├── scramble.js            (WCA-compliant 3x3 scramble generator)
│       ├── soundEffects.js        (Web Audio API synthesizer)
│       └── timerStats.js          (WCA Ao5, Ao12, session stats)
```
