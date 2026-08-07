import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Paperclip, X, Mic, MicOff, Volume2 } from 'lucide-react';
import ThinkingTrace from './ThinkingTrace';
import useVoice from '../hooks/useVoice';

export default function StudentChatbot({ user, currentSession }) {
  const studentId = user?.id || '';
  const studentName = user?.name || studentId;

  const defaultWelcome = {
    sender: 'bot',
    text: `Hello ${studentName}! I'm your Campus AI Assistant.\n\nI can help you with:\n• "What is my attendance?"\n• "Show me available jobs"\n• Upload your notes (PDF/Image) to ask questions about them!\n• Upload a resume to build your profile.`
  };

  const [messages, setMessages] = useState([defaultWelcome]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [modelStatus, setModelStatus] = useState("Groq llama-3.3-70b"); // <-- ADD THIS
  
  const { listening, startListening, stopListening, speak } = useVoice();
  const fileRef = useRef(null);
  const bottomRef = useRef(null);

  // Load messages for the CURRENT active session
  useEffect(() => {
    if (!studentId || !currentSession) return;

    fetch(`/api/chat-logs/${studentId}`)
      .then(res => res.json())
      .then(data => {
        if (data.logs && data.logs.length > 0) {
          const sessionLogs = data.logs.filter(log => log.session_id === currentSession);
          if (sessionLogs.length > 0) {
            const formattedLogs = sessionLogs.map(log => ({
              sender: log.role === 'user' ? 'user' : 'bot',
              text: log.content,
              trace: log.trace || null,
            }));
            setMessages([defaultWelcome, ...formattedLogs]);
          } else {
            setMessages([defaultWelcome]);
          }
        }
      })
      .catch(err => console.error("Failed to load chat history:", err));
  }, [studentId, currentSession]); 

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, showThinking]);

  // Drag and Drop Handlers
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const send = async () => {
    if ((!input.trim() && !file) || loading) return;
    
    // Display what the user typed, or a default message if they just sent a file
    const userText = input.trim() || (file ? `[Uploaded Document: ${file.name}] Please read this and assist me.` : '');
    setMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setInput('');
    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('student_id', studentId);
      fd.append('query', userText);
      fd.append('session_id', currentSession); 
      if (file) fd.append('file', file);

      // This perfectly matches your new backend multimodal endpoint
      const res = await fetch('/api/chat/student/multimodal', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.trace && data.trace.some(t => t.step === 'fallback')) {
        setModelStatus("Ollama Local Fallback");
      } else {
        setModelStatus("Groq llama-3.3-70b");
      }
      setMessages(prev => [...prev, { sender: 'bot', text: data.reply, tailored: data.tailored_file, trace: data.trace }]);
    } catch {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Server error. Please try again.' }]);
    } finally {
      setLoading(false);
      setFile(null); // Clear the file after sending
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const toggleListening = () => {
    if (listening) {
      stopListening();
    } else {
      startListening((transcript) => {
        setInput((prev) => prev ? `${prev} ${transcript}` : transcript);
      });
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%', background: 'var(--bg-body)', position: 'relative' }}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(59, 130, 246, 0.1)', border: '2px dashed #3B82F6',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', color: '#3B82F6', fontWeight: 'bold', backdropFilter: 'blur(2px)'
        }}>
          Drop your notes (PDF/Image) here to upload
        </div>
      )}

      {/* Header */}
      <div className="chat-header" style={{ padding: '16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
        <div className="chat-ai-avatar"><Bot size={18} /></div>
        <div>
          <div className="chat-ai-name">Campus AI Assistant</div>
          <div className="chat-ai-status" style={{ color: modelStatus.includes("Ollama") ? "var(--amber)" : "var(--green)" }}>
            {modelStatus} · OCR Notes Active
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
          {studentId}
          <button onClick={() => setShowThinking(v => !v)} className="btn-secondary btn-sm" style={{ marginLeft: '10px' }}>
            {showThinking ? 'Hide' : 'Show'} Thinking
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.sender}`}>
            <div className="chat-msg-avatar">
              {m.sender === 'user' ? (studentName[0] || 'U').toUpperCase() : <Bot size={14} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', maxWidth: '80%' }}>
              <div className="chat-msg-bubble">
                {m.text}
                {m.sender === 'bot' && (
                  <button 
                    onClick={() => speak(m.text)}
                    title="Read aloud"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 8px', color: 'var(--text-muted)', verticalAlign: 'middle'}}
                  >
                    <Volume2 size={14} />
                  </button>
                )}
              </div>
              {showThinking && m.trace && <ThinkingTrace trace={m.trace}/>}
              {m.tailored && (
                <a href={`/api/resume/tailored/${m.tailored}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm" style={{ marginTop: '8px', display: 'inline-flex', textDecoration: 'none' }}>
                  📄 View Tailored Resume
                </a>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-thinking">
            <span>Reading document & thinking</span>
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
          <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: 'auto' }}><X size={13} /></button>
        </div>
      )}

      {/* Input Area */}
      <div className="chat-input-area" style={{ padding: '16px', background: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <button type="button" onClick={() => fileRef.current?.click()} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}><Paperclip size={16} /></button>
        <button type="button" onClick={toggleListening} style={{ background: listening ? 'rgba(239, 68, 68, 0.1)' : 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', cursor: 'pointer', color: listening ? '#EF4444' : 'var(--text-muted)', flexShrink: 0 }}>
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] || null)} />
        <textarea className="chat-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder={listening ? "Listening..." : "Upload notes or ask anything..."} rows={1} style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-body)', color: 'var(--text-main)', resize: 'none', fontFamily: 'inherit' }} />
        <button className="btn-primary" onClick={send} disabled={loading || (!input.trim() && !file)} style={{ flexShrink: 0, padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Send size={16} /></button>
      </div>
    </div>
  );
}