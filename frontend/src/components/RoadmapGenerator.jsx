import React, { useState, useEffect } from 'react';
import {
  Map, Zap, BookOpen, Calendar, RefreshCw,
  ChevronDown, ChevronUp, Star, Target, CheckCircle,
  Layers, Code2, ExternalLink, Download
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

const PHASE_COLORS = [
  { bg: '#ede9fe', border: '#8b5cf6', badge: '#7c3aed', text: '#5b21b6' },
  { bg: '#dbeafe', border: '#3b82f6', badge: '#2563eb', text: '#1e40af' },
  { bg: '#d1fae5', border: '#10b981', badge: '#059669', text: '#065f46' },
  { bg: '#fef3c7', border: '#f59e0b', badge: '#d97706', text: '#92400e' },
  { bg: '#fce7f3', border: '#ec4899', badge: '#db2777', text: '#9d174d' },
  { bg: '#e0f2fe', border: '#0ea5e9', badge: '#0284c7', text: '#075985' },
];

function parseRoadmap(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const phases = [];
  const projects = [];
  let currentPhase = null;
  let inProjects = false;

  const phaseHeaderRe = /^#{1,3}\s*(Phase\s*\d+|Week\s*\d+(?:\s*[-–—to]+\s*\d+)?|Week\s*\d+)[:\s]*(.*)/i;
  const bulletRe = /^\s*[-*•]\s+(.*)/;
  const numberedRe = /^\s*\d+[.)]\s+(.*)/;

  const flush = () => {
    if (currentPhase && (currentPhase.items.length > 0 || currentPhase.title)) {
      phases.push(currentPhase);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;

    if (/mini[- ]project|project ideas?|capstone/i.test(line)) {
      inProjects = true;
    }

    const phaseMatch = line.match(phaseHeaderRe);

    if (phaseMatch && !inProjects) {
      flush();
      currentPhase = {
        label: phaseMatch[1].trim(),
        title: phaseMatch[2].trim(),
        items: [],
        resources: [],
      };
      inProjects = false;
      continue;
    }

    if (inProjects && (bulletRe.test(line) || numberedRe.test(line))) {
      const content = (line.match(bulletRe)?.[1] || line.match(numberedRe)?.[1] || '').replace(/\*\*/g, '');
      if (content) projects.push(content);
      continue;
    }

    if (currentPhase) {
      const bulletMatch = line.match(bulletRe) || line.match(numberedRe);
      if (bulletMatch) {
        let content = bulletMatch[1].replace(/\*\*/g, '');
        const examCritical = /exam[- ]critical/i.test(content);
        const placementCritical = /placement[- ]critical/i.test(content);
        content = content.replace(/\*\*(exam[- ]critical|placement[- ]critical)[:\s]*\*\*/gi, '').trim();
        const urlMatch = content.match(/(https?:\/\/[^\s)]+)/);
        const isResource = /youtube|docs?|book|tutorial|course|udemy|coursera|github|freecodecamp|leetcode|codeforces|hackerrank/i.test(content);
        if (isResource || urlMatch) {
          currentPhase.resources.push({ text: content, url: urlMatch?.[1] });
        } else {
          currentPhase.items.push({ text: content, examCritical, placementCritical });
        }
      } else if (/^#{1,4}/.test(line)) {
        const subTitle = line.replace(/^#{1,4}\s*/, '').replace(/\*\*/g, '');
        if (subTitle && !/phase|week|project/i.test(subTitle)) {
          currentPhase.items.push({ text: subTitle, isSectionTitle: true });
        }
      }
    }
  }
  flush();

  if (phases.length === 0) return null;
  return { phases, projects };
}

function PhaseCard({ phase, index, color }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{
      borderRadius: 14, border: `2px solid ${color.border}`, background: '#fff',
      overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', border: 'none', cursor: 'pointer', textAlign: 'left',
          background: color.bg, padding: '16px 20px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}
      >
        <div style={{
          background: color.badge, color: '#fff', borderRadius: 10,
          padding: '4px 12px', fontSize: 12, fontWeight: 800,
          whiteSpace: 'nowrap', flexShrink: 0, letterSpacing: 0.4,
        }}>
          {phase.label}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: color.text }}>
            {phase.title || `Learning Phase ${index + 1}`}
          </div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
            {phase.items.length} task{phase.items.length !== 1 ? 's' : ''}
            {phase.resources.length > 0 && ` · ${phase.resources.length} resource${phase.resources.length !== 1 ? 's' : ''}`}
          </div>
        </div>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: color.badge, flexShrink: 0 }} />
        {open ? <ChevronUp size={16} color={color.text} /> : <ChevronDown size={16} color={color.text} />}
      </button>

      {open && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {phase.items.map((item, i) => (
            item.isSectionTitle ? (
              <div key={i} style={{
                fontSize: 12, fontWeight: 800, color: color.text,
                textTransform: 'uppercase', letterSpacing: 0.8,
                marginTop: i > 0 ? 8 : 0, marginBottom: 2,
              }}>{item.text}</div>
            ) : (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '8px 12px', borderRadius: 8,
                background: item.examCritical ? '#fef9c3' : item.placementCritical ? '#d1fae5' : '#f9fafb',
                border: item.examCritical ? '1px solid #fde047' : item.placementCritical ? '1px solid #6ee7b7' : '1px solid #e5e7eb',
              }}>
                <CheckCircle
                  size={15}
                  color={item.examCritical ? '#ca8a04' : item.placementCritical ? '#059669' : color.badge}
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, flex: 1 }}>{item.text}</span>
                {item.examCritical && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: '#fde047', color: '#92400e', borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>📝 EXAM</span>
                )}
                {item.placementCritical && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: '#6ee7b7', color: '#065f46', borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>🎯 PLACEMENT</span>
                )}
              </div>
            )
          ))}
          {phase.resources.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', marginBottom: 6, letterSpacing: 0.6 }}>📚 RESOURCES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {phase.resources.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                    borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe',
                  }}>
                    <ExternalLink size={13} color='#2563eb' style={{ flexShrink: 0 }} />
                    {r.url ? (
                      <a href={r.url} target='_blank' rel='noreferrer' style={{ fontSize: 13, color: '#1d4ed8', textDecoration: 'none', flex: 1 }}>{r.text}</a>
                    ) : (
                      <span style={{ fontSize: 13, color: '#1d4ed8', flex: 1 }}>{r.text}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TimelineConnector({ color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '0 0 0 40px' }}>
      <div style={{ width: 2, height: 24, background: `linear-gradient(to bottom, ${color.border}, transparent)` }} />
    </div>
  );
}

function ProjectShowcase({ projects }) {
  if (!projects || projects.length === 0) return null;
  return (
    <div style={{
      borderRadius: 14, background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)',
      padding: '24px', marginTop: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Code2 size={17} color='#fff' />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9' }}>🚀 Capstone Projects</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Build these to strengthen your portfolio</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {projects.slice(0, 4).map((proj, i) => (
          <div key={i} style={{
            background: '#1e293b', border: '1px solid #334155', borderRadius: 10,
            padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, flexShrink: 0,
              background: ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b'][i % 4],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff',
            }}>{i + 1}</div>
            <span style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{proj}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualRoadmap({ roadmapText, topic, weeks }) {
  const parsed = parseRoadmap(roadmapText);
  if (!parsed) {
    return (
      <div style={{
        background: 'var(--bg-app)', borderRadius: 12, padding: '24px 28px',
        fontSize: 14, color: 'var(--text-body)', lineHeight: 1.9,
        whiteSpace: 'pre-wrap', fontFamily: "'Inter', monospace",
        border: '1px solid var(--border)', maxHeight: 600, overflowY: 'auto',
      }}>
        {roadmapText}
      </div>
    );
  }
  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {parsed.phases.map((_, i) => (
          <React.Fragment key={i}>
            <div style={{ height: 6, flex: 1, minWidth: 20, borderRadius: 4, background: PHASE_COLORS[i % PHASE_COLORS.length].badge, opacity: 0.8 }} />
            {i < parsed.phases.length - 1 && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#d1d5db', flexShrink: 0 }} />}
          </React.Fragment>
        ))}
      </div>
      {/* Phase cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {parsed.phases.map((phase, i) => {
          const color = PHASE_COLORS[i % PHASE_COLORS.length];
          return (
            <React.Fragment key={i}>
              <PhaseCard phase={phase} index={i} color={color} />
              {i < parsed.phases.length - 1 && <TimelineConnector color={color} />}
            </React.Fragment>
          );
        })}
      </div>
      <ProjectShowcase projects={parsed.projects} />
    </div>
  );
}

export default function RoadmapGenerator({ studentId }) {
  const storageKey = `smart_campus_roadmap_state_${studentId || 'default'}`;

  const [topic, setTopic] = useState(() => {
    try { const saved = localStorage.getItem(storageKey); return saved ? JSON.parse(saved).topic || '' : ''; } catch { return ''; }
  });
  const [weeks, setWeeks] = useState(() => {
    try { const saved = localStorage.getItem(storageKey); return saved ? JSON.parse(saved).weeks || 8 : 8; } catch { return 8; }
  });
  const [roadmap, setRoadmap] = useState(() => {
    try { const saved = localStorage.getItem(storageKey); return saved ? JSON.parse(saved).roadmap || '' : ''; } catch { return ''; }
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ topic, weeks, roadmap })); } catch {}
  }, [topic, weeks, roadmap, storageKey]);

  const generate = async (overrideTopic = null) => {
    const finalTopic = (overrideTopic !== null ? overrideTopic : topic).trim();
    if (!finalTopic) return;
    setGenerating(true);
    setError('');
    setExpanded(true);
    try {
      // ── Fast path: dedicated roadmap endpoint (1 LLM call, not 3) ──
      const res = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          topic: finalTopic,
          weeks,
        }),
      });
      const data = await res.json();
      if (data.status === 'error') {
        setError(data.message || 'Generation failed. Try again.');
      } else {
        setRoadmap(data.reply || 'No roadmap generated. Try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setGenerating(false);
    }
  };


  const handleQuickTopic = (t) => { setTopic(t); generate(t); };
  const handleDownload = () => {
    const blob = new Blob([roadmap], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roadmap-${topic.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 28, color: '#fff',
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{
          width: 52, height: 52, background: 'rgba(255,255,255,0.2)',
          borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>⚡ Quick Start</h3>
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
                transition: 'all 0.15s', opacity: generating ? 0.6 : 1, boxShadow: 'var(--shadow-sm)',
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
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>🎯 Custom Topic</h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>TOPIC / SKILL / ROLE</label>
            <input
              id="roadmap-custom-topic"
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generate()}
              placeholder="e.g. Networking for placements, React + Node.js, Rust systems programming..."
              style={{
                width: '100%', padding: '11px 16px', borderRadius: 9,
                border: '1px solid var(--border-input)', fontSize: 14, outline: 'none', color: 'var(--text-dark)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>WEEKS</label>
            <select
              id="roadmap-weeks-select"
              value={weeks}
              onChange={e => setWeeks(Number(e.target.value))}
              style={{ padding: '11px 14px', borderRadius: 9, border: '1px solid var(--border-input)', fontSize: 14, outline: 'none', background: '#fff' }}
            >
              {[4, 6, 8, 10, 12, 16].map(w => (<option key={w} value={w}>{w} weeks</option>))}
            </select>
          </div>
          <button
            id="roadmap-generate-btn"
            className="btn-primary"
            onClick={() => generate()}
            disabled={generating || !topic.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 24px', whiteSpace: 'nowrap' }}
          >
            {generating ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Generating spinner */}
      {generating && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, background: 'var(--purple-light)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
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
        <div style={{ padding: '14px 20px', borderRadius: 10, background: 'var(--red-light)', color: '#991b1b', fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      {/* Visual Roadmap Result */}
      {roadmap && !generating && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              width: '100%', padding: '20px 28px', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(90deg,var(--purple-light),var(--blue-light))',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: expanded ? '1px solid var(--border)' : 'none',
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
            <div style={{ padding: '24px 28px' }}>
              {/* Meta badges */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { icon: <Star size={12} />, text: "Skips topics you've already covered", color: 'var(--purple)' },
                  { icon: <Target size={12} />, text: 'Includes job-fit gap insights', color: '#10b981' },
                  { icon: <Calendar size={12} />, text: `${weeks}-week plan`, color: 'var(--blue)' },
                  { icon: <Layers size={12} />, text: 'Visual timeline', color: '#f59e0b' },
                ].map(({ icon, text, color }) => (
                  <span key={text} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: color + '15', color,
                    fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                  }}>
                    {icon} {text}
                  </span>
                ))}
              </div>

              <VisualRoadmap roadmapText={roadmap} topic={topic} weeks={weeks} />

              <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                <button
                  id="roadmap-regenerate-btn"
                  onClick={() => generate()}
                  style={{
                    padding: '9px 20px', borderRadius: 8, border: '1px solid var(--purple)',
                    background: 'var(--purple-light)', color: 'var(--purple)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}
                >
                  <RefreshCw size={13} /> Regenerate
                </button>
                <button
                  onClick={handleDownload}
                  style={{
                    padding: '9px 20px', borderRadius: 8, border: '1px solid var(--border)',
                    background: '#fff', color: 'var(--text-body)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}
                >
                  <Download size={13} /> Save as .txt
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
