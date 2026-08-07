import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send } from 'lucide-react';
import ThinkingTrace from './ThinkingTrace';

export default function AdminChatbot({ user }) {
  const adminId = user?.id || 'admin';

  const [messages, setMessages] = useState([{
    sender: 'bot',
    text: `Hello! I'm your Admin AI Assistant (Groq + LangChain Tool Calling).\n\nWhat I can do:\n• Post placement drive — "Post a placement drive for Senior Software Engineer at Google, requirements: Python, React, DSA, branch: CSE"\n• Post attendance — "Post attendance for System Design on 2026-08-07 period 3, CSE section A — 1602-24-733-160 and 1602-24-733-161 were present"\n• Register a student — "Register student Ravi Kumar, 1602-24-733-165, CSE section A, year 2"\n• List students — "Show me students in CSE section A"\n• View applications — "Show all job applications"\n• Check contests — "Show upcoming Codeforces contests"`
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [modelStatus, setModelStatus] = useState("Groq llama-3.3-70b"); // <-- ADD THIS
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, showThinking]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: adminId, query: userText })
      });
      const data = await res.json();
      if (data.trace && data.trace.some(t => t.step === 'fallback')) {
        setModelStatus("Ollama Local Fallback");
      } else {
        setModelStatus("Groq llama-3.3-70b");
      }
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: data.reply, 
        trace: data.trace 
      }]);
    } catch {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Server error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="chat-ai-avatar"><Bot size={18} /></div>
        <div>
          <div className="chat-ai-name">Admin AI Assistant</div>
          <div className="chat-ai-status" style={{ color: modelStatus.includes("Ollama") ? "var(--amber)" : "var(--green)" }}>
            {modelStatus} · Tool Calling Active
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
          Logged in as: <strong>{adminId}</strong>
          <button
            onClick={() => setShowThinking(v => !v)}
            className="btn-secondary btn-sm"
            style={{ marginLeft: '10px' }}
          >
            {showThinking ? 'Hide' : 'Show'} Thinking
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.sender}`}>
            <div className="chat-msg-avatar">
              {m.sender === 'user' ? 'A' : <Bot size={14} />}
            </div>
            <div>
              <div className="chat-msg-bubble">{m.text}</div>
              {showThinking && m.trace && <ThinkingTrace trace={m.trace} />}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-thinking">AI is thinking & calling tools...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder='e.g. "Post attendance for System Design on 2026-08-07 period 2, CSE-A — 1602-24-733-160 was present"'
          rows={1}
        />
        <button className="btn-primary" onClick={send} disabled={loading} style={{ flexShrink: 0 }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}