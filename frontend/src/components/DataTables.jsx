import React, { useState } from 'react';

/**
 * DataTables - Real-time Page Table and Segment Table rendering.
 */
export default function DataTables({ state }) {
  const [selectedProcess, setSelectedProcess] = useState(null);

  if (!state) return null;

  const { mode, processes } = state;
  const runningProcesses = processes.filter((p) => p.state === 'running');

  // Auto-select first process if none selected
  const activeProcess =
    runningProcesses.find((p) => p.id === selectedProcess) ||
    runningProcesses[0] ||
    null;

  return (
    <div className="card animate-in">
      <div className="card__header">
        <span className="card__title">
          <span className="icon">📑</span>
          {mode === 'paging' ? 'Page Table' : 'Segment Table'}
        </span>
        {runningProcesses.length > 0 && (
          <select
            className="select"
            value={activeProcess?.id || ''}
            onChange={(e) => setSelectedProcess(e.target.value)}
            style={{ fontSize: '0.7rem', padding: '4px 24px 4px 8px' }}
          >
            {runningProcesses.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sizeKB}KB)
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="card__body">
        {!activeProcess ? (
          <div className="empty-state">
            <span className="empty-state__icon">📭</span>
            <span className="empty-state__text">
              No running processes to display tables for.
            </span>
          </div>
        ) : mode === 'paging' ? (
          <PageTableView process={activeProcess} />
        ) : (
          <SegmentTableView process={activeProcess} />
        )}
      </div>
    </div>
  );
}

/**
 * Page Table View for a specific process
 */
function PageTableView({ process }) {
  if (!process.pageTable || process.pageTable.length === 0) return null;

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Page #</th>
            <th>Frame #</th>
            <th>Valid</th>
            <th>Modified</th>
            <th>In Swap</th>
          </tr>
        </thead>
        <tbody>
          {process.pageTable.map((entry) => (
            <tr key={entry.pageNumber}>
              <td>{entry.pageNumber}</td>
              <td>{entry.valid ? entry.frameNumber : '—'}</td>
              <td className={entry.valid ? 'valid' : 'invalid'}>
                {entry.valid ? '✓' : '✗'}
              </td>
              <td>{entry.modified ? '●' : '○'}</td>
              <td>{entry.inSwap ? '⬇ Yes' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{
        marginTop: '8px',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        display: 'flex',
        gap: '12px',
      }}>
        <span>
          <span style={{ color: process.color, marginRight: '4px' }}>●</span>
          {process.name}
        </span>
        <span>Page Faults: <strong style={{ color: 'var(--accent-warning)' }}>{process.pageFaults}</strong></span>
      </div>
    </div>
  );
}

/**
 * Segment Table View for a specific process
 */
function SegmentTableView({ process }) {
  if (!process.segmentTable || process.segmentTable.length === 0) return null;

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Seg #</th>
            <th>Name</th>
            <th>Base</th>
            <th>Limit</th>
            <th>Valid</th>
          </tr>
        </thead>
        <tbody>
          {process.segmentTable.map((entry) => (
            <tr key={entry.segmentId}>
              <td>{entry.segmentId}</td>
              <td style={{ fontFamily: 'var(--font-sans)' }}>{entry.name}</td>
              <td>{entry.base}KB</td>
              <td>{entry.limit}KB</td>
              <td className={entry.valid ? 'valid' : 'invalid'}>
                {entry.valid ? '✓' : '✗'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{
        marginTop: '8px',
        fontSize: '0.7rem',
        color: 'var(--text-muted)',
        display: 'flex',
        gap: '12px',
      }}>
        <span>
          <span style={{ color: process.color, marginRight: '4px' }}>●</span>
          {process.name}
        </span>
        <span>Total: <strong>{process.sizeKB}KB</strong></span>
      </div>
    </div>
  );
}
