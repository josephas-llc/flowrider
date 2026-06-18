import React, { useState } from 'react';
import { useStore } from '../store';

interface SessionMessage {
  id: string;
  fromSession: number;
  toSession: number | 'broadcast';
  content: string;
  timestamp: number;
  type: 'text' | 'data' | 'request' | 'response';
}

// Demo messages
const DEMO_MESSAGES: SessionMessage[] = [
  {
    id: 'msg-1',
    fromSession: 0,
    toSession: 2,
    content: 'API endpoint /users ready for integration',
    timestamp: Date.now() - 30000,
    type: 'text',
  },
  {
    id: 'msg-2',
    fromSession: 2,
    toSession: 0,
    content: 'Acknowledged. Updating frontend to use new endpoint.',
    timestamp: Date.now() - 25000,
    type: 'response',
  },
  {
    id: 'msg-3',
    fromSession: 4,
    toSession: 'broadcast',
    content: 'Database schema migration complete. All sessions can proceed.',
    timestamp: Date.now() - 10000,
    type: 'text',
  },
];

export const SessionMessaging: React.FC = () => {
  const { sessions, selectedFace } = useStore();
  const [messages, setMessages] = useState<SessionMessage[]>(DEMO_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [targetSession, setTargetSession] = useState<number | 'broadcast'>('broadcast');

  const activeSessions = sessions.filter(s => s.status !== 'empty');

  const sendMessage = () => {
    if (!newMessage.trim() || selectedFace === null) return;

    const msg: SessionMessage = {
      id: `msg-${Date.now()}`,
      fromSession: selectedFace,
      toSession: targetSession,
      content: newMessage,
      timestamp: Date.now(),
      type: 'text',
    };

    setMessages([...messages, msg]);
    setNewMessage('');
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getSessionName = (index: number | 'broadcast') => {
    if (index === 'broadcast') return 'All Sessions';
    return sessions[index]?.name || `Session ${index + 1}`;
  };

  return (
    <div className="session-messaging">
      <div className="messaging-header">
        <h3>Session-to-Session Messaging</h3>
        <span className="a2a-badge">A2A Protocol</span>
      </div>

      <div className="messaging-info">
        <p>Enable AI sessions to coordinate and share context with each other.</p>
      </div>

      <div className="message-list">
        {messages.length === 0 ? (
          <div className="no-messages">
            No messages yet. Sessions can communicate to coordinate work.
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`message ${msg.type}`}>
              <div className="message-header">
                <span className="from">
                  #{msg.fromSession + 1} {getSessionName(msg.fromSession)}
                </span>
                <span className="arrow">→</span>
                <span className="to">
                  {msg.toSession === 'broadcast' ? '📢 All' : `#${(msg.toSession as number) + 1}`}
                </span>
                <span className="time">{formatTime(msg.timestamp)}</span>
              </div>
              <div className="message-content">{msg.content}</div>
            </div>
          ))
        )}
      </div>

      {selectedFace !== null && (
        <div className="message-compose">
          <div className="compose-header">
            <span>From: #{selectedFace + 1} {sessions[selectedFace]?.name}</span>
            <select
              value={targetSession === 'broadcast' ? 'broadcast' : targetSession}
              onChange={(e) => setTargetSession(e.target.value === 'broadcast' ? 'broadcast' : parseInt(e.target.value))}
            >
              <option value="broadcast">Broadcast to All</option>
              {activeSessions
                .filter(s => s.faceIndex !== selectedFace)
                .map(s => (
                  <option key={s.faceIndex} value={s.faceIndex}>
                    #{s.faceIndex + 1} {s.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="compose-input">
            <input
              type="text"
              placeholder="Type a message to other sessions..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} disabled={!newMessage.trim()}>
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
