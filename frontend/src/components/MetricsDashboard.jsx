import React from 'react';

/**
 * MetricsDashboard - Live counters for memory utilization, fragmentation, page faults.
 */
export default function MetricsDashboard({ state }) {
  if (!state || !state.metrics) return null;

  const { metrics, stats, mode } = state;

  // Determine utilization color
  const utilClass =
    metrics.utilizationPercent > 90
      ? 'metric-item__value--danger'
      : metrics.utilizationPercent > 70
      ? 'metric-item__value--warning'
      : 'metric-item__value--success';

  // Gradient for utilization bar
  const utilBarColor =
    metrics.utilizationPercent > 90
      ? 'var(--gradient-danger)'
      : metrics.utilizationPercent > 70
      ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
      : metrics.utilizationPercent > 40
      ? 'linear-gradient(90deg, #10b981, #f59e0b)'
      : 'var(--gradient-success)';

  return (
    <div className="card animate-in">
      <div className="card__header">
        <span className="card__title">
          <span className="icon">📊</span>
          Metrics Dashboard
        </span>
      </div>
      <div className="card__body">
        <div className="metrics-grid">
          {/* Utilization bar */}
          <div className="utilization-bar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="metric-item__label">Memory Utilization</span>
              <span className={`metric-item__value ${utilClass}`} style={{ fontSize: '0.9rem' }}>
                {metrics.utilizationPercent.toFixed(1)}%
              </span>
            </div>
            <div className="utilization-bar__track">
              <div
                className="utilization-bar__fill"
                style={{
                  width: `${metrics.utilizationPercent}%`,
                  background: utilBarColor,
                }}
              />
            </div>
          </div>

          {/* Memory stats */}
          <div className="metric-item">
            <div className="metric-item__label">Used</div>
            <div className="metric-item__value metric-item__value--accent">
              {metrics.usedMemoryKB}KB
            </div>
          </div>

          <div className="metric-item">
            <div className="metric-item__label">Free</div>
            <div className="metric-item__value metric-item__value--success">
              {metrics.freeMemoryKB}KB
            </div>
          </div>

          {/* Mode-specific metrics */}
          {mode === 'paging' ? (
            <>
              <div className="metric-item">
                <div className="metric-item__label">Internal Frag.</div>
                <div className={`metric-item__value ${metrics.internalFragmentationKB > 0 ? 'metric-item__value--warning' : ''}`}>
                  {metrics.internalFragmentationKB}KB
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-item__label">Page Faults</div>
                <div className={`metric-item__value ${metrics.pageFaults > 0 ? 'metric-item__value--danger' : ''}`}>
                  {metrics.pageFaults}
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-item__label">Swap Used</div>
                <div className="metric-item__value">
                  {metrics.swapUsed}/{metrics.swapTotal}
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-item__label">Frames</div>
                <div className="metric-item__value">
                  {metrics.occupiedFrames}/{metrics.totalFrames}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="metric-item">
                <div className="metric-item__label">External Frag.</div>
                <div className={`metric-item__value ${metrics.externalFragmentationKB > 0 ? 'metric-item__value--warning' : ''}`}>
                  {metrics.externalFragmentationKB}KB
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-item__label">Largest Free</div>
                <div className="metric-item__value metric-item__value--success">
                  {metrics.largestFreeBlockKB}KB
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-item__label">Blocks</div>
                <div className="metric-item__value">
                  {metrics.occupiedBlocks}/{metrics.totalBlocks}
                </div>
              </div>

              <div className="metric-item">
                <div className="metric-item__label">Compactions</div>
                <div className="metric-item__value">
                  {stats.totalCompactions}
                </div>
              </div>
            </>
          )}

          {/* Global stats */}
          <div className="metric-item">
            <div className="metric-item__label">Allocations</div>
            <div className="metric-item__value">{stats.totalAllocations}</div>
          </div>

          <div className="metric-item">
            <div className="metric-item__label">Deallocations</div>
            <div className="metric-item__value">{stats.totalDeallocations}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
