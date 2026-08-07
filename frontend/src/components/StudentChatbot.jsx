import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Paperclip, X, User } from 'lucide-react';

export default function StudentChatbot({ user }) {
  const studentId = user?.id || '';
  const studentName = user?.name || studentId;

  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: `Hello ${studentName}! I'm your Campus AI Assistant.\n\nI can help you with:\n• "What is my attendance?" — checks your real attendance from the database\n• "Show me available jobs" — lists all open placement drives\n• "Apply for job 1" — tailors your resume to the job and submits the application\n• "Show my resume profile" — displays your parsed resume\n• Upload a PDF or DOCX resume using the attachment icon to build your profile`
    }
  ]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if ((!input.trim() && !file) || loading) return;
    const userText = input.trim() || (file ? `[Uploaded: ${file.name}]` : '');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('student_id', studentId);
      fd.append('query', input.trim() || 'I uploaded a file, please process it.');
      if (file) fd.append('file', file);

      const res = await fetch('/api/chat/student/multimodal', { method: 'POST', body: fd });
      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'bot', text: data.reply, tailored: data.tailored_file }]);
    } catch {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Server error. Please try again.' }]);
    } finally {
      setLoading(false);
      setFile(null);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-ai-avatar"><Bot size={18} /></div>
        <div>
          <div className="chat-ai-name">Campus AI Assistant</div>
          <div className="chat-ai-status">Groq llama-3.3-70b · Tool Calling Active</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
          {studentId}
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.sender}`}>
            <div className="chat-msg-avatar">
              {m.sender === 'user' ? (studentName[0] || 'U').toUpperCase() : <Bot size={14} />}
            </div>
            <div>
              <div className="chat-msg-bubble">{m.text}</div>
              {m.tailored && (
                <a
                  href={`/api/resume/tailored/${m.tailored}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary btn-sm"
                  style={{ marginTop: '8px', display: 'inline-flex', textDecoration: 'none' }}
                >
                  📄 View Tailored Resume
                </a>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-thinking">
            <span>AI is thinking & calling tools</span>
            <span style={{ animation: 'blink 1.2s infinite' }}>...</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* File preview */}
      {file && (
        <div style={{ padding: '8px 16px', background: '#EFF6FF', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--blue-dark)' }}>
          <Paperclip size={13} />
          <span>{file.name}</span>
          <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            <X size={13} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="chat-input-area">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          style={{ background: 'none', border: '1px solid var(--border-input)', borderRadius: 'var(--radius-sm)', padding: '8px', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
          title="Attach file (PDF, DOCX, image)"
        >
          <Paperclip size={15} />
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] || null)} />

        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything — attendance, jobs, resume, apply for a job..."
          rows={1}
        />
        <button className="btn-primary" onClick={send} disabled={loading} style={{ flexShrink: 0 }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
