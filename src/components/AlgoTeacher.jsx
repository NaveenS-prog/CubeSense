import React, { useState } from 'react';
import { LucideRotateCw } from 'lucide-react';

// We'll define some common OLL and PLL algorithms for 2-look
// In a real app, this data might come from a JSON file or be more extensive
const OLL_CASES = [
  { name: 'Sune', notation: 'R U R\' U R U2 R\'', pattern: 'sune' },
  { name: 'Antisune', notation: 'R U2 R\' U\' R U\' R\'', pattern: 'antisune' },
  { name: 'Headlights', notation: 'R2 D R\' U2 R D\' R\' U2 R\'', pattern: 'headlights' },
  { name: 'Superman', notation: 'R U2\' R2\' F R F\' U2\' R\' F R F\'', pattern: 'superman' },
  { name: 'Hammerhead', notation: 'R\' F R F\' R\' U2 R U\' R\' U2 R', pattern: 'hammerhead' },
  { name: 'Chameleon', notation: 'r U R\' U\' r\' F R F\'', pattern: 'chameleon' },
  { name: 'Bowtie', notation: 'F\' r U R\' U\' r\' F R', pattern: 'bowtie' },
  { name: 'Wheel', notation: 'R U2 R2\' F R F\' U2\' R\' F R F\'', pattern: 'wheel' },
];

const PLL_CASES = [
  { name: 'T-Perm', notation: 'R U R\' U\' R\' F R2 U\' R\' U\' R U R\' F\'', pattern: 'tperm' },
  { name: 'Y-Perm', notation: 'F R U\' R\' U\' R U R\' F\' R U R\' U\' R\' F R F\'', pattern: 'yperm' },
  { name: 'U-Perm (a)', notation: 'R U\' R U R U R U\' R\' U\' R2', pattern: 'upmma' },
  { name: 'U-Perm (b)', notation: 'R2 U R U R\' U\' R\' U\' R\' U R\'', pattern: 'upmmb' },
  { name: 'Z-Perm', notation: 'M2 U M2 U M\' U2 M2 U2 M\' U2', pattern: 'zperm' },
  { name: 'H-Perm', notation: 'M2 U M2 U2 M2 U M2', pattern: 'hperm' },
  { name: 'E-Perm', notation: 'x\' R U\' R\' D R U R\' u2 R\' U R D R\' U\' R', pattern: 'eperm' },
  { name: 'A-Perm (a)', notation: 'x R\' U R\' D2 R U\' R\' D2 R2', pattern: 'apmma' },
  { name: 'A-Perm (b)', notation: 'x R2 D2 R U R\' D2 R U\' R\'', pattern: 'apmmb' },
];

// Helper function to generate a scramble that sets up a specific OLL/PLL case
// This is a simplified version - in reality, you'd need a proper cube simulator
// For demonstration, we'll just return a placeholder scramble
const generateSetupScramble = (caseName) => {
  // In a full implementation, this would use a cube library to generate a scramble
  // that results in the given OLL/PLL case
  // For now, we return a random scramble with a note
  return `Setup for ${caseName}: ${generateScramble()}`;
};

function AlgoTeacher() {
  const [activeTab, setActiveTab] = useState('oll'); // 'oll' or 'pll'
  const [selectedCase, setSelectedCase] = useState(null);
  const [timerScramble, setTimerScramble] = useState(''); // To be sent to timer

  // In a real app, we would communicate with the timer component to reset and set scramble
  // For simplicity, we'll just store the scramble in state and hope the timer can access it
  // Better solution: use a state management library or pass callbacks up to parent
  // Since we don't have that set up, we'll simulate by setting a global state or using an event
  // We'll use a simple approach: when "Practice This" is clicked, we'll set a scramble
  // and then we expect the timer to read it from somewhere (like localStorage or a context)
  // For this demo, we'll just alert the scramble and note that in a real app it would be sent to the timer.

  const handlePractice = (caseObj) => {
    setSelectedCase(caseObj);
    const setupScramble = generateSetupScramble(caseObj.name);
    setTimerScramble(setupScramble);
    // In a real app, we would:
    // 1. Reset the timer
    // 2. Set the scramble on the timer
    // 3. Switch to the timer tab
    // Since we can't directly access the timer component state, we'll use localStorage as a simple bridge
    try {
      localStorage.setItem('vibeTimerScramble', setupScramble);
      localStorage.setItem('vibeTimerReset', 'true'); // Signal to reset
    } catch (e) {
      console.warn('Unable to use localStorage:', e);
    }
    alert(`Setup scramble for ${caseObj.name}:\n${setupScramble}\n\nIn a full app, this would be sent to the timer and the timer would reset.`);
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b border-[var(--neon-green)]/10 pb-2">
        <button
          onClick={() => setActiveTab('oll')}
          className={`tab-button ${activeTab === 'oll' ? 'active' : ''} px-4 py-2`}
        >
          <LucideRotateCw className="w-4 h-4 mr-2" /> 2-Look OLL
        </button>
        <button
          onClick={() => setActiveTab('pll')}
          className={`tab-button ${activeTab === 'pll' ? 'active' : ''} px-4 py-2`}
        >
          2-Look PLL
        </button>
      </div>

      {/* Algorithm List */}
      <div className="space-y-4">
        {(activeTab === 'oll' ? OLL_CASES : PLL_CASES).map((caseObj) => (
          <div key={caseObj.name} className={`algo-card ${selectedCase === caseObj ? 'border-[var(--neon-green)]/40' : ''}`}>
            <div className="flex items-start space-x-3">
              {/* Algorithm SVG placeholder */}
              <div className="algo-svg flex-shrink-0">
                {/* In a real app, we would render an SVG representing the cube's top layer pattern */}
                <div className="w-16 h-16 bg-[var(--bg-darker)] rounded flex items-center justify-center text-[var(--text-muted)] font-mono text-xs">
                  {caseObj.pattern}
                </div>
              </div>
              <div>
                <div className="algo-name">{caseObj.name}</div>
                <div className="algo-notation">{caseObj.notation}</div>
                <button
                  onClick={() => handlePractice(caseObj)}
                  className="practice-button"
                >
                  Practice This
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Case Detail */}
      {selectedCase && (
        <div className="bg-[var(--bg-darker)] rounded-lg p-4 border border-[var(--neon-green)]/20">
          <h3 className="text-lg font-semibold text-[var(--neon-green)] mb-2">
            {selectedCase.name}
          </h3>
          <div className="text-[var(--text-muted)] mb-2">
            Notation: <code className="font-mono">{selectedCase.notation}</code>
          </div>
          <div className="text-sm text-[var(--text-light)]">
            <p>To practice this case:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Apply the scramble: <code className="bg-[var(--bg-darker)] px-1 py-0.5 rounded">{timerScramble}</code></li>
              <li>Solve the cube using the algorithm above</li>
              <li>Use the Smart Timer to time your solution</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlgoTeacher;
