import React from 'react';

/**
 * SwapSpace - Visual representation of swap space usage (paging mode).
 */
export default function SwapSpace({ state }) {
  if (!state || state.mode !== 'paging') return null;

  const { swapSpace, config } = state;

  if (!swapSpace || swapSpace.length === 0) return null;

  const occupiedCount = swapSpace.filter((s) => s.occupied).length;

  return (
    <div className="card animate-in">
      <div className="card__header">
        <span className="card__title">
          <span className="icon">💾</span>
          Swap Space
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          color: occupiedCount > 0 ? 'var(--accent-warning)' : 'var(--text-muted)',
        }}>
          {occupiedCount}/{swapSpace.length} used
        </span>
      </div>
      <div className="card__body">
        <div className="swap-grid">
          {swapSpace.map((slot) => (
            <div
              key={slot.frameNumber}
              className={`swap-slot ${
                slot.occupied ? 'swap-slot--occupied' : 'swap-slot--free'
              }`}
              title={
                slot.occupied
                  ? `Swap ${slot.frameNumber}: Process page ${slot.pageNumber}`
                  : `Swap ${slot.frameNumber}: Free`
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
