import React, { useRef, useEffect } from 'react';

/**
 * EventLog - Real-time scrolling log of memory events.
 */
export default function EventLog({ state }) {
  const logEndRef = useRef(null);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state?.eventLog?.length]);

  if (!state || !state.eventLog) return null;

  const { eventLog } = state;

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="card animate-in">
      <div className="card__header">
        <span className="card__title">
          <span className="icon">📝</span>
          Event Log ({eventLog.length})
        </span>
      </div>
      <div className="card__body" style={{ padding: '10px' }}>
        {eventLog.length === 0 ? (
          <div className="empty-state" style={{ padding: '20px' }}>
            <span className="empty-state__icon">📭</span>
            <span className="empty-state__text">No events yet.</span>
          </div>
        ) : (
          <div className="event-log">
            {eventLog.map((event, index) => (
              <div
                key={`${event.timestamp}-${index}`}
                className={`event-item event-item--${event.type}`}
              >
                <span className="event-item__time">
                  {formatTime(event.timestamp)}
                </span>
                <span className="event-item__message">{event.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
