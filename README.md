# CubeSense

A modern, high-performance speedcubing web application featuring a WCA-compliant smart timer, audio cues, inspection, statistics, interactive 2D scramble verification, and the complete CFOP algorithm suite (all 41 F2L, 57 OLL, and 21 PLL cases) with a dedicated Algorithm Practice Studio.

![CubeSense Speedcubing Platform](https://raw.githubusercontent.com/NaveenS-prog/CubeSense/main/public/vite.svg)

---

## Key Features

### 1. Complete CFOP Algorithm Suite (119 Cases)
- **Full 41 F2L Cases**: Basic inserts, corner in U, edge in U, white facing up, and pieces in slot with FR slot targets.
- **Full 57 OLL Cases**: All Dot cases, All Edges Oriented (OCLL), Small/Big Lightning Bolts, Fish shapes, Knight moves, Awkward shapes, P-shapes, T-shapes, C-shapes, W-shapes, L-shapes, and I-shapes with 3x3 yellow facelets and orientation bars.
- **Full 21 PLL Cases**: All corner permutations (Aa, Ab, E), edge permutations (Ua, Ub, H, Z), and adjacent/diagonal swaps (T, F, Ja, Jb, Ra, Rb, G-perms, V, Y, Na, Nb) with permutation cycle arrows.
- **2-Look Subsets**: Dedicated filters for 2-Look OLL (7 cases) and 2-Look PLL (6 cases).

### 2. Dedicated Algorithm Practice Studio (`AlgoTrainer`)
- **Speed Drill Mode**:
  - Automatically generates inverted **setup scrambles** to set up any case on a physical cube.
  - Dedicated drill stopwatch with spacebar controls (hold 250ms to ready, release to drill).
  - Personal Best (PB) tracker per algorithm saved in `localStorage`.
  - Session average and rep counter.
  - "Peek Formula" toggle to test recognition and muscle memory.
  - Keyboard navigation (`Space` = timer, `N` = next, `P` = previous, `H` = peek formula).
- **Flashcard Recognition Mode**:
  - Test case recognition from the diagram alone without looking at the notation.
  - Score counter and accuracy tracking.
- **Complete Library & Cheat Sheet**:
  - Instant live search by name, notation, or triggers.
  - One-click copy for notations and setup scrambles.
  - Bookmark favorite cases.

### 3. WCA Smart Timer
- **WCA State Machine**:
  - `Idle` → `Inspection` (15s WCA countdown with 8s and 12s audible alerts)
  - `Holding` (300ms hold countdown to arm timer)
  - `Ready` (Glowing neon green armed state)
  - `Running` (Starts the millisecond spacebar or touchpads are released)
  - `Stopped` (Stops the millisecond any key is pressed or pads are touched)
- **Flexible Controls**: Full keyboard spacebar control with hold-to-start timing, plus optional on-screen touchpads for phones and touch devices.

### 4. Audio Synthesizer (Web Audio API)
- Zero external audio files (100% offline-ready, no network latency).
- Natural synthesized sine and triangle frequency alerts for 8s inspection warning, 12s urgent warning, ready chimes, solve stop, and PB celebrations.

### 5. 2D Scramble Verification Net
- Real-time unfolded 2D cube net preview of the exact scrambled state.
- Accurately tracks every move via an in-memory 54-facelet cube permutation engine.

---

## Tech Stack
- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS & custom speedcubing dark glassmorphism design system
- **Audio**: Web Audio API (native oscillator synthesis)
- **Icons**: Lucide React
- **Cloud Backend (Optional)**: Supabase (Auth, PostgreSQL database, RLS policies)

---

## Getting Started

```bash
# Clone the repository
git clone https://github.com/NaveenS-prog/CubeSense.git
cd CubeSense

# Install dependencies
npm install

# Start development server
npm run dev
```

Build for production:
```bash
npm run build
```
