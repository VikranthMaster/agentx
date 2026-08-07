import React, { useState, useEffect } from 'react';
import {
  Map, Zap, BookOpen, Calendar, RefreshCw,
  ChevronDown, ChevronUp, Star, Target
} from 'lucide-react';

const QUICK_TOPICS = [
  { label: 'Data Structures & Algorithms', icon: '🧩' },
  { label: 'System Design', icon: '🏗️' },
  { label: 'Machine Learning', icon: '🤖' },
  { label: 'Full-Stack Web Development', icon: '🌐' },
  { label: 'DevOps & Cloud', icon: '☁️' },
  { label: 'Database Design & SQL', icon: '🗄️' },
  { label: 'Competitive Programming', icon: '🏆' },
  { label: 'Interview Preparation', icon: '🎯' },
];

export default function RoadmapGenerator({ studentId }) {
  const storageKey = `smart_campus_roadmap_state_${studentId || 'default'}`;

  const [topic, setTopic] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).topic || '' : '';
    } catch { return ''; }
  });

  const [weeks, setWeeks] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).weeks || 8 : 8;
    } catch { return 8; }
  });

  const [roadmap, setRoadmap] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).roadmap || '' : '';
    } catch { return ''; }
  });

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ topic, weeks, roadmap }));
    } catch {}
  }, [topic, weeks, roadmap, storageKey]);

  const generate = async (overrideTopic = null) => {
    const finalTopic = (overrideTopic !== null ? overrideTopic : topic).trim();
    if (!finalTopic) return;
    setGenerating(true);
    setError('');
    setExpanded(true);
    try {
      const fd = new FormData();
      fd.append('student_id', studentId);
      fd.append('query',
        `Generate a ${weeks}-week learning roadmap for the topic: "${finalTopic}". ` +
        `Tailor it to my academic year and what I've already covered in my curriculum.`
      );
      const res = await fetch('/api/chat/student/multimodal', { method: 'POST', body: fd });
      const data = await res.json();
      setRoadmap(data.reply || 'No roadmap generated. Try again.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleQuickTopic = (t) => {
    setTopic(t);
    generate(t);
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 28, color: '#fff',
        display: 'flex', alignItems: 'center', gap: 20
      }}>
        <div style={{
          width: 52, height: 52, background: 'rgba(255,255,255,0.2)',
          borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <Map size={28} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Learning Roadmap Generator</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.85 }}>
            Personalised, curriculum-aware roadmaps — builds on what you already know, skips what you've covered
          </p>
        </div>
      </div>

      {/* Quick Topics */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>
          ⚡ Quick Start
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {QUICK_TOPICS.map(({ label, icon }) => (
            <button
              key={label}
              id={`roadmap-quick-${label.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => handleQuickTopic(label)}
              disabled={generating}
              style={{
                padding: '8px 16px', borderRadius: 20, border: '1px solid var(--border)',
                background: '#fff', color: 'var(--text-body)', fontSize: 13, fontWeight: 500,
                cursor: generating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                transition: 'all 0.15s', opacity: generating ? 0.6 : 1,
                boxShadow: 'var(--shadow-sm)'
              }}
              onMouseOver={e => { if (!generating) { e.currentTarget.style.background = 'var(--purple-light)'; e.currentTarget.style.color = 'var(--purple)'; e.currentTarget.style.borderColor = 'var(--purple)'; } }}
              onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'var(--text-body)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Input */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>
          🎯 Custom Topic
        </h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              TOPIC / SKILL / ROLE
            </label>
            <input
              id="roadmap-custom-topic"
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder="e.g. Networking for placements, React + Node.js, Rust systems programming..."
              style={{
                width: '100%', padding: '11px 16px', borderRadius: 9,
                border: '1px solid var(--border-input)', fontSize: 14, outline: 'none', color: 'var(--text-dark)'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
              WEEKS
            </label>
            <select
              id="roadmap-weeks-select"
              value={weeks}
              onChange={e => setWeeks(Number(e.target.value))}
              style={{ padding: '11px 14px', borderRadius: 9, border: '1px solid var(--border-input)', fontSize: 14, outline: 'none', background: '#fff' }}
            >
              {[4, 6, 8, 10, 12, 16].map(w => (
                <option key={w} value={w}>{w} weeks</option>
              ))}
            </select>
          </div>
          <button
            id="roadmap-generate-btn"
            className="btn-primary"
            onClick={() => generate()}
            disabled={generating || !topic.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', whiteSpace: 'nowrap' }}
          >
            {generating
              ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Zap size={14} />}
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Result */}
      {generating && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, background: 'var(--purple-light)',
            borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <RefreshCw size={24} color="var(--purple)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--text-dark)' }}>Building Your Roadmap...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 360, margin: '0 auto' }}>
            Analysing your curriculum, academic year, and any job-fit gaps on file to skip what you already know.
          </p>
        </div>
      )}

      {error && (
        <div style={{
          padding: '14px 20px', borderRadius: 10, background: 'var(--red-light)',
          color: '#991b1b', fontSize: 13, marginBottom: 16
        }}>{error}</div>
      )}

      {roadmap && !generating && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: '100%', padding: '20px 28px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(90deg,var(--purple-light),var(--blue-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: expanded ? '1px solid var(--border)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <BookOpen size={18} color="var(--purple)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)' }}>
                  Your {weeks}-Week Roadmap: {topic}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Personalised · Curriculum-aware · Built on your existing knowledge
                </div>
              </div>
            </div>
            {expanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
          </button>

          {expanded && (
            <div style={{ padding: '28px 32px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { icon: <Star size={12} />, text: 'Skips topics you\'ve already covered', color: 'var(--purple)' },
                  { icon: <Target size={12} />, text: 'Includes job-fit gap insights', color: '#10b981' },
                  { icon: <Calendar size={12} />, text: `${weeks}-week plan`, color: 'var(--blue)' },
                ].map(({ icon, text, color }) => (
                  <span key={text} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: color + '15', color: color,
                    fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20
                  }}>
                    {icon} {text}
                  </span>
                ))}
              </div>

              <div style={{
                background: 'var(--bg-app)', borderRadius: 12, padding: '24px 28px',
                fontSize: 14, color: 'var(--text-body)', lineHeight: 1.9,
                whiteSpace: 'pre-wrap', fontFamily: "'Inter', monospace",
                border: '1px solid var(--border)', maxHeight: 600, overflowY: 'auto'
              }}>
                {roadmap}
              </div>

              <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
                <button
                  id="roadmap-regenerate-btn"
                  onClick={() => generate()}
                  style={{
                    padding: '9px 20px', borderRadius: 8, border: '1px solid var(--purple)',
                    background: 'var(--purple-light)', color: 'var(--purple)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7
                  }}
                >
                  <RefreshCw size={13} /> Regenerate
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([roadmap], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `roadmap-${topic.replace(/\s+/g, '-').toLowerCase()}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
                    background: '#fff', color: 'var(--text-body)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7
                  }}
                >
                  💾 Save as .txt
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
