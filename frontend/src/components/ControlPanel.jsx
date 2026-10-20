import React from 'react';

/**
 * ControlPanel - Simulation controls, mode/algorithm selection, tick rate.
 */
export default function ControlPanel({ state, emit }) {
  if (!state) return null;

  const { mode, algorithm, isRunning, tickRate } = state;

  const handleTickRateChange = (e) => {
    emit('set-tick-rate', { tickRate: parseInt(e.target.value) });
  };

  return (
    <div className="card control-panel animate-in">
      {/* Playback controls */}
      <div className="control-group">
        <span className="control-group__label">Simulation</span>
        {!isRunning ? (
          <button className="btn btn--success" onClick={() => emit('start')}>
            ▶ Start
          </button>
        ) : (
          <button className="btn btn--ghost" onClick={() => emit('pause')}>
            ⏸ Pause
          </button>
        )}
        <button className="btn btn--ghost" onClick={() => emit('step')} title="Step one tick">
          ⏭ Step
        </button>
        <button className="btn btn--danger btn--sm" onClick={() => emit('reset')}>
          ↺ Reset
        </button>
      </div>

      <div className="control-divider" />

      {/* Mode selection */}
      <div className="control-group">
        <span className="control-group__label">Mode</span>
        <select
          className="select"
          value={mode}
          onChange={(e) => emit('set-mode', { mode: e.target.value })}
        >
          <option value="paging">Paging</option>
          <option value="segmentation">Segmentation</option>
        </select>
      </div>

      <div className="control-divider" />

      {/* Algorithm selection */}
      <div className="control-group">
        <span className="control-group__label">Algorithm</span>
        <select
          className="select"
          value={algorithm}
          onChange={(e) => emit('set-algorithm', { algorithm: e.target.value })}
        >
          <option value="first-fit">First Fit</option>
          <option value="best-fit">Best Fit</option>
          <option value="worst-fit">Worst Fit</option>
        </select>
      </div>

      <div className="control-divider" />

      {/* Tick rate */}
      <div className="control-group">
        <span className="control-group__label">Speed</span>
        <input
          type="range"
          className="range-slider"
          min="100"
          max="3000"
          step="100"
          value={tickRate}
          onChange={handleTickRateChange}
          style={{ width: '120px' }}
        />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {tickRate}ms
        </span>
      </div>

      {/* Compact button (segmentation only) */}
      {mode === 'segmentation' && (
        <>
          <div className="control-divider" />
          <div className="control-group">
            <button className="btn btn--primary btn--sm" onClick={() => emit('compact')}>
              ⚡ Compact
            </button>
          </div>
        </>
      )}
    </div>
  );
}
