import React from 'react';
import { useSocket } from './hooks/useSocket';
import ControlPanel from './components/ControlPanel';
import MemoryGrid from './components/MemoryGrid';
import MetricsDashboard from './components/MetricsDashboard';
import ProcessManager from './components/ProcessManager';
import DataTables from './components/DataTables';
import EventLog from './components/EventLog';
import SwapSpace from './components/SwapSpace';

function App() {
  const { isConnected, state, emit } = useSocket();

  // Connection overlay
  if (!isConnected) {
    return (
      <div className="connection-overlay">
        <div className="connection-card">
          <div className="spinner" />
          <h2>Connecting to Memory Engine...</h2>
          <p>Make sure the backend server is running on port 3001</p>
          <p style={{ marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Run: <code style={{ color: 'var(--accent-primary-light)', fontFamily: 'var(--font-mono)' }}>cd backend && npm start</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__title">
          <span className="icon">🧠</span>
          <h1>Real-Time Memory Allocation Tracker</h1>
        </div>
        <div className="app-header__status">
          {state && (
            <>
              <div className="tick-counter">
                Tick #{state.tickCount}
              </div>
              <div
                className={`status-badge ${
                  state.isRunning ? 'status-badge--running' : 'status-badge--paused'
                }`}
              >
                <span className="status-badge__dot" />
                {state.isRunning ? 'Running' : 'Paused'}
              </div>
              <div className="status-badge status-badge--running" style={{
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-primary-light)',
                borderColor: 'rgba(99, 102, 241, 0.3)',
              }}>
                {state.mode === 'paging' ? '📄 Paging' : '📐 Segmentation'}
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Control Panel - spans full width */}
        <ControlPanel state={state} emit={emit} />

        {/* Left: Memory Visualization */}
        <MemoryGrid state={state} />

        {/* Right: Sidebar */}
        <div className="sidebar">
          <MetricsDashboard state={state} />
          <ProcessManager state={state} emit={emit} />
          <DataTables state={state} />
          <SwapSpace state={state} />
          <EventLog state={state} />
        </div>
      </main>
    </div>
  );
}

export default App;
