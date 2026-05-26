import React, { useState } from 'react';
import SmartTimer from './components/SmartTimer';
import AlgoTeacher from './components/AlgoTeacher';

function App() {
  const [activeTab, setActiveTab] = useState('timer'); // 'timer' or 'teacher'

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--neon-green)]/10">
        <h1 className="text-2xl font-bold text-[var(--neon-green)]">VibeTimer & CubeTeacher</h1>
        <div className="flex space-x-2">
          <button
            className={`tab-button ${activeTab === 'timer' ? 'active' : ''}`}
            onClick={() => setActiveTab('timer')}
          >
            Smart Timer
          </button>
          <button
            className={`tab-button ${activeTab === 'teacher' ? 'active' : ''}`}
            onClick={() => setActiveTab('teacher')}
          >
            Algo Teacher
          </button>
        </div>
      </header>

      {/* Tab Content */}
      <main className="flex-1 p-6">
        {activeTab === 'timer' && (
          <section className="space-y-6">
            <SmartTimer />
          </section>
        )}
        {activeTab === 'teacher' && (
          <section className="space-y-6">
            <AlgoTeacher />
          </section>
        )}
      </main>
    </div>
  );
}

export default App;