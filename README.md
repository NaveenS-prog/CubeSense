# CubeSense

A modern, high-performance speedcubing web application featuring a WCA-compliant smart timer, audio cues, inspection, statistics, interactive 2D scramble verification, and an intelligent CFOP algorithm trainer.

![CubeSense Speedcubing Platform](https://raw.githubusercontent.com/NaveenS-prog/CubeSense/main/public/vite.svg)

---

## Key Features

### 1. WCA Smart Timer
- **WCA State Machine**:
  - `Idle` → `Inspection` (15s WCA countdown with 8s and 12s audible alerts)
  - `Holding` (300ms hold countdown to arm timer)
  - `Ready` (Glowing neon green armed state)
  - `Running` (Starts the millisecond spacebar or touchpads are released)
  - `Stopped` (Stops the millisecond any key is pressed or pads are touched)
- **Flexible Controls**: Full keyboard spacebar control with hold-to-start timing, plus optional on-screen touchpads for phones and touch devices.

### 2. Audio Synthesizer (Web Audio API)
- Zero external audio files (100% offline-ready, no network latency).
- WCA 8-second inspection alert ("8 seconds").
- WCA 12-second inspection warning ("12 seconds").
- Ready armed chime, start pop, stop tone, and triumphant Personal Best (PB) fanfare!
- One-click mute/unmute control.

### 3. Interactive Scramble Verification & Multi-Event
- **WCA Scramble Generator**: Supports 3x3x3, 2x2x2, 4x4x4, and 3x3 One-Handed (OH) with cancellation protection (no consecutive or opposite face cancellation).
- **2D Unfolded Cube Net**: Real-time 3x3 Rubik's cube state simulator rendering an unfolded 6-face SVG net (U, L, F, R, B, D) to verify scrambles before starting inspection.

### 4. CFOP Algorithm Trainer (Algo Teacher)
- **Comprehensive Library**:
  - **2-Look OLL** (Edge orientation cross cases & corner orientation cases)
  - **2-Look PLL** (Corner swaps & edge permutations)
  - **Full PLL** (All 21 standard WCA permutation cases: T, Y, Ua, Ub, H, Z, J, R, F, V, E, A, G, N perms)
- **Dynamic SVG Visualizers**:
  - OLL: Top-down yellow facelets with side orientation bars.
  - PLL: Permutation cycle arrows and swap vectors.
- **True Inverted Setup Scrambles**: Mathematically inverts the algorithm so applying the setup scramble on a solved cube recreates the exact case!
- **Direct Practice Mode**: Practice any algorithm on the Smart Timer with live algorithm prompts and dedicated practice tagging.

### 5. WCA Regulations Statistics & Solve Analytics
- **Accurate WCA Ao5 / Ao12 Trimming**: Properly drops the best and worst times (counting single DNF as worst time, and failing to DNF average only when ≥ 2 DNFs occur).
- **Session Intelligence**: Real-time tracking of PB (Best Single), Worst Single, Session Mean, Current Ao5, Best Ao5, Current Ao12, and Best Ao12.
- **Interactive Solve Detail Modal**: Click any solve to review exact timestamps, raw vs penalty time, 2D scramble preview net, re-scramble trigger, and +2/DNF management.
- **Session Progress Chart**: SVG sparkline trend graph showing solve progression over time.
- **Data Portability**: 1-click export of session solves to JSON or CSV format.
- **Optional Cloud Sync**: Sync sessions and solves across devices with Supabase authentication.

---

## Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS, custom speedcubing neon design system
- **Audio**: Web Audio API (native oscillator synthesis)
- **Icons**: Lucide React
- **Cloud Backend (Optional)**: Supabase (Auth, PostgreSQL database, RLS policies)

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm or yarn

### Installation
```bash
# Clone the repository
git clone https://github.com/NaveenS-prog/CubeSense.git
cd CubeSense

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production
```bash
npm run build
npm run preview
```

---

## Cloud Sync Setup (Optional)

To enable cross-device cloud sync with Supabase:
1. Create a free project at [supabase.com](https://supabase.com).
2. Execute the schema in [`supabase-schema.sql`](./supabase-schema.sql) in the Supabase SQL Editor.
3. Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```
4. Restart your development server. Solves and timing sessions will automatically synchronize!

---

## License

MIT License. Crafted for the speedcubing community.
