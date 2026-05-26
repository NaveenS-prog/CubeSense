# VibeTimer & CubeTeacher

A modern web application for speedcubing featuring:
- Camera-triggered cube timer using hand detection (MediaPipe Hands)
- Interactive algorithm teacher for OLL/PLL practice

## Features

### Smart Timer
- Starts when both hands lift from flat position (ready state detected when both hands flat)
- Stops when both hands return to flat position
- Keyboard fallback: Spacebar down = ready, release = start, any key = stop
- Random scramble generator
- Session history

### Algo Teacher
- 2-Look OLL and PLL algorithms
- Visual representation of each case
- Practice button that generates setup scrambles
- Integration with timer for timed practice

## Tech Stack
- React 18
- Vite
- Tailwind CSS
- MediaPipe Hands (via CDN)
- Lucide React (icons)

## Setup
```bash
npm install
npm run dev
```

## Implementation Notes
- The hand detection uses MediaPipe Hands solution from CDN
- For simplicity in this prototype, the flat hand detection always returns true when hands are detected
- In a production version, proper landmark analysis would be implemented to detect actual flat hand positions
- The algorithm teacher uses placeholder SVGs; in a full implementation these would be proper cube face representations