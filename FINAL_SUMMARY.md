# CubeSense - Enhanced Speedcubing Application

## Overview
CubeSense is a comprehensive speedcubing platform featuring a WCA-compliant smart timer with audio synthesis, inspection and statistics, interactive 2D scramble verification, and an intelligent CFOP algorithm trainer.

## Key Improvements Implemented

1. **WCA Smart Timer**:
   - Official WCA inspection countdown (15s) with 8s and 12s voice/audio alerts.
   - Precise hold-to-start timing (300ms hold) with spacebar controls and on-screen touchpads.
   - Distinct timer states (`idle`, `inspection`, `holding`, `ready`, `running`, `stopped`).

2. **Web Audio API Synthesizer**:
   - Zero external audio files (100% offline-ready).
   - Official WCA 8-second and 12-second audible alerts during inspection.
   - Armed ready chime (300ms hold reached), start click, stop tone, and triumphant Personal Best (PB) fanfare.
   - One-click mute toggle.

3. **Rubik's Cube Simulator & 2D Scramble Net**:
   - Built 3x3 Rubik's cube state engine (`src/utils/cubeSimulator.js`) supporting all face turns, rotations, and slice moves.
   - Unfolded 6-face 2D Net SVG visualizer (`src/components/CubeNetVisualizer.jsx`) so cubers can verify their scrambles.
   - Multi-event support: 3x3x3, 2x2x2, 4x4x4, and 3x3 One-Handed (OH).

4. **CFOP Algorithm Trainer (Algo Teacher)**:
   - Comprehensive database of 2-Look OLL (edges & corners), 2-Look PLL, and full 21 PLL cases (`src/data/algorithms.js`).
   - High-fidelity SVG diagrams (`src/components/AlgoVisualizer.jsx`): OLL yellow facelets with side orientation bars, and PLL permutation cycle arrows.
   - Real mathematical algorithm inverter that generates exact setup scrambles.
   - Direct Practice Mode on Smart Timer with dedicated practice banner.

5. **WCA Statistics & Analytics**:
   - Fixed WCA Ao5 and Ao12 trimming rules (single DNF treated as worst time; DNF average only when ≥ 2 DNFs).
   - Real-time tracking of PB, Worst Single, Session Mean, Current Ao5, Best Ao5, Current Ao12, and Best Ao12.
   - Interactive Solve Detail Modal with timestamp, raw/penalty times, scramble string, 2D preview net, and re-scramble trigger.
   - SVG session trend sparkline chart.
   - 1-click export of session solves to JSON or CSV format.

## File Structure
```
CubeSense/
├── index.html
├── src/
│   ├── main.jsx
│   ├── index.css
│   ├── App.jsx
│   ├── data/
│   │   └── algorithms.js
│   ├── lib/
│   │   └── supabaseClient.js
│   ├── utils/
│   │   ├── cubeSimulator.js
│   │   ├── scramble.js
│   │   ├── soundEffects.js
│   │   └── timerStats.js
│   ├── hooks/
│   │   └── useTimerSessions.js
│   └── components/
│       ├── SmartTimer.jsx
│       ├── AlgoTeacher.jsx
│       ├── AlgoVisualizer.jsx
│       ├── CubeNetVisualizer.jsx
│       ├── AuthPanel.jsx
│       ├── ResetPassword.jsx
│       └── layout/
│           ├── Sidebar.jsx
│           ├── SolveHistoryPanel.jsx
│           ├── SolveDetailModal.jsx
│           └── SessionTrendChart.jsx
├── package.json
├── vite.config.js
└── README.md
```
