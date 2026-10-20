import React, { useState } from 'react';

/**
 * ProcessManager - Add new processes and view/kill running processes.
 */
export default function ProcessManager({ state, emit }) {
  const [name, setName] = useState('');
  const [sizeKB, setSizeKB] = useState('16');
  const [lifetime, setLifetime] = useState('0');

  if (!state) return null;

  const { processes, readyQueue, config } = state;

  const handleSubmit = (e) => {
    e.preventDefault();
    const size = parseInt(sizeKB);
    const life = parseInt(lifetime);

    if (!name.trim() || size <= 0) return;
    if (size > config.totalMemoryKB) {
      alert(`Process size cannot exceed total memory (${config.totalMemoryKB}KB)`);
      return;
    }

    emit('add-process', {
      name: name.trim(),
      sizeKB: size,
      lifetimeTicks: life > 0 ? life : 0,
    });

    setName('');
    setSizeKB('16');
    setLifetime('0');
  };

  const allProcesses = [
    ...processes.filter(p => p.state === 'running'),
    ...readyQueue,
  ];

  // Quick add presets
  const presets = [
    { name: 'Chrome', size: 32 },
    { name: 'Node.js', size: 24 },
    { name: 'VSCode', size: 48 },
    { name: 'Slack', size: 16 },
    { name: 'Docker', size: 40 },
    { name: 'Spotify', size: 20 },
  ];

  const handlePreset = (preset) => {
    emit('add-process', {
      name: preset.name,
      sizeKB: preset.size,
      lifetimeTicks: Math.floor(Math.random() * 15) + 5,
    });
  };

  return (
    <>
      {/* Add Process Form */}
      <div className="card animate-in">
        <div className="card__header">
          <span className="card__title">
            <span className="icon">➕</span>
            Add Process
          </span>
        </div>
        <div className="card__body">
          <form className="add-process-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-group__label">Process Name</label>
              <input
                className="input"
                type="text"
                placeholder="e.g., Chrome, Node.js"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-group__label">Size (KB)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max={config.totalMemoryKB}
                  value={sizeKB}
                  onChange={(e) => setSizeKB(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-group__label">Lifetime (ticks)</label>
                <input
                  className="input"
                  type="number"
                  min="0"
                  placeholder="0 = manual"
                  value={lifetime}
                  onChange={(e) => setLifetime(e.target.value)}
                />
              </div>
            </div>
            <button className="btn btn--primary" type="submit" style={{ width: '100%' }}>
              ➕ Allocate Process
            </button>
          </form>

          {/* Quick presets */}
          <div style={{ marginTop: '12px' }}>
            <span className="form-group__label">Quick Add</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {presets.map((preset) => (
                <button
                  key={preset.name}
                  className="btn btn--ghost btn--sm"
                  onClick={() => handlePreset(preset)}
                  type="button"
                >
                  {preset.name} ({preset.size}KB)
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Process List */}
      <div className="card animate-in">
        <div className="card__header">
          <span className="card__title">
            <span className="icon">📋</span>
            Active Processes ({allProcesses.length})
          </span>
        </div>
        <div className="card__body">
          {allProcesses.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state__icon">🚀</span>
              <span className="empty-state__text">
                No active processes.<br />Add one above to start!
              </span>
            </div>
          ) : (
            <div className="process-list">
              {allProcesses.map((proc) => (
                <div key={proc.id} className="process-item">
                  <div
                    className="process-item__color"
                    style={{ backgroundColor: proc.color }}
                  />
                  <span className="process-item__name">{proc.name}</span>
                  <span className="process-item__size">{proc.sizeKB}KB</span>
                  <span
                    className={`process-item__state process-item__state--${proc.state}`}
                  >
                    {proc.state}
                  </span>
                  {proc.lifetimeTicks > 0 && (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      color: 'var(--text-muted)',
                    }}>
                      {proc.ticksElapsed}/{proc.lifetimeTicks}
                    </span>
                  )}
                  <button
                    className="process-item__kill"
                    onClick={() => emit('kill-process', { processId: proc.id })}
                  >
                    ✕ Kill
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
