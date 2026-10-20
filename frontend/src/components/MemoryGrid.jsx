import React, { useRef, useMemo, useEffect } from 'react';

/**
 * MemoryGrid - Visual representation of physical memory frames (paging mode)
 * or segment blocks (segmentation mode).
 */
export default function MemoryGrid({ state }) {
  if (!state) return null;

  const { mode, frames, segmentBlocks, config } = state;

  if (mode === 'paging') {
    return <PagingGrid frames={frames} config={config} />;
  } else {
    return <SegmentationMap blocks={segmentBlocks} config={config} />;
  }
}

/**
 * Paging Grid - Renders memory frames as a color-coded grid
 */
function PagingGrid({ frames, config }) {
  const prevFramesRef = useRef({});

  // Track newly allocated frames for animation
  const frameStates = useMemo(() => {
    const states = {};
    const prevMap = prevFramesRef.current;

    frames.forEach((frame) => {
      const prevOccupied = prevMap[frame.frameNumber];
      if (frame.occupied && !prevOccupied) {
        states[frame.frameNumber] = 'new';
      } else if (!frame.occupied && prevOccupied) {
        states[frame.frameNumber] = 'freed';
      }
    });

    // Update prev map
    const newPrev = {};
    frames.forEach((f) => {
      newPrev[f.frameNumber] = f.occupied;
    });
    prevFramesRef.current = newPrev;

    return states;
  }, [frames]);

  // Calculate grid columns based on total frames
  const cols = Math.ceil(Math.sqrt(frames.length));

  return (
    <div className="card memory-grid-section animate-in">
      <div className="card__header">
        <span className="card__title">
          <span className="icon">🧮</span>
          Physical Memory — Paging Mode
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {config.totalMemoryKB}KB · {config.totalFrames} frames · {config.pageSizeKB}KB/frame
        </span>
      </div>
      <div className="memory-grid-container">
        <div
          className="memory-grid"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {frames.map((frame) => {
            const isOccupied = frame.occupied;
            const animClass = frameStates[frame.frameNumber] === 'new'
              ? 'memory-frame--new'
              : frameStates[frame.frameNumber] === 'freed'
              ? 'memory-frame--freed'
              : '';

            return (
              <div
                key={frame.frameNumber}
                className={`memory-frame ${
                  isOccupied ? 'memory-frame--occupied' : 'memory-frame--free'
                } ${animClass}`}
                style={
                  isOccupied
                    ? { backgroundColor: frame.processColor || '#6366f1' }
                    : {}
                }
              >
                {isOccupied ? `P${frame.pageNumber}` : frame.frameNumber}
                <div className="memory-frame__tooltip">
                  {isOccupied
                    ? `Frame ${frame.frameNumber} → ${frame.processName} Page ${frame.pageNumber}`
                    : `Frame ${frame.frameNumber} — Free`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Segmentation Map - Renders memory as variable-sized blocks
 */
function SegmentationMap({ blocks, config }) {
  const totalKB = config.totalMemoryKB;

  return (
    <div className="card memory-grid-section animate-in">
      <div className="card__header">
        <span className="card__title">
          <span className="icon">📐</span>
          Physical Memory — Segmentation Mode
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {config.totalMemoryKB}KB total
        </span>
      </div>
      <div className="memory-grid-container">
        <div className="segment-map">
          {blocks.map((block, index) => {
            const heightPercent = Math.max(2, (block.size / totalKB) * 100);
            const isOccupied = block.occupied;

            return (
              <div
                key={`${block.start}-${index}`}
                className={`segment-block ${
                  isOccupied ? 'segment-block--occupied' : 'segment-block--free'
                }`}
                style={{
                  height: `${heightPercent}%`,
                  minHeight: '32px',
                  backgroundColor: isOccupied
                    ? block.processColor || '#6366f1'
                    : undefined,
                }}
              >
                <div className="segment-block__info">
                  {isOccupied ? (
                    <>
                      <span>{block.segmentName}</span>
                      <span style={{ opacity: 0.7, fontSize: '0.65rem' }}>
                        ({block.processId?.slice(0, 8)}...)
                      </span>
                    </>
                  ) : (
                    <span>Free Block</span>
                  )}
                </div>
                <div className="segment-block__size">
                  {block.size}KB @ {block.start}KB
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
