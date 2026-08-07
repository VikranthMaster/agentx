import React, { useState, useEffect } from 'react';
import {
  Trophy, Calendar, Users, Plus, ChevronRight,
  Clock, Target, Zap, X, Send, CheckCircle2,
  AlertCircle, RefreshCw, Lightbulb, UserCheck, Trash2
} from 'lucide-react';

export default function HackathonHub({ role, studentId }) {
  const isAdmin = role === 'admin';
  const storageKey = `smart_campus_hackathon_state_${role}_${studentId || 'default'}`;

  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).activeTab || 'browse' : 'browse';
    } catch { return 'browse'; }
  });

  const [teamName, setTeamName] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).teamName || '' : '';
    } catch { return ''; }
  });

  const [interests, setInterests] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).interests || '' : '';
    } catch { return ''; }
  });

  const [ideaResult, setIdeaResult] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).ideaResult || '' : '';
    } catch { return ''; }
  });

  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved && JSON.parse(saved).form ? JSON.parse(saved).form : {
        title: '', description: '', tech_focus: '',
        start_date: '', end_date: '', registration_deadline: '',
        team_size_max: 4, posted_by: 'admin'
      };
    } catch {
      return {
        title: '', description: '', tech_focus: '',
        start_date: '', end_date: '', registration_deadline: '',
        team_size_max: 4, posted_by: 'admin'
      };
    }
  });

  const [posting, setPosting] = useState(false);
  const [postMsg, setPostMsg] = useState(null);
  const [applyModal, setApplyModal] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState(null);
  const [ideateModal, setIdeateModal] = useState(null);
  const [ideating, setIdeating] = useState(false);
  const [applicantsModal, setApplicantsModal] = useState(null);
  const [applicantsLoading, setApplicantsLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        activeTab, teamName, interests, ideaResult, form
      }));
    } catch {}
  }, [activeTab, teamName, interests, ideaResult, form, storageKey]);

  const fetchHackathons = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hackathons');
      const data = await res.json();
      setHackathons(data.hackathons || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchHackathons(); }, []);

  const daysLeft = (deadline) => {
    const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
    return diff;
  };

  // ── Admin: post hackathon ──────────────────────────────────────────────────
  const handlePost = async () => {
    if (!form.title || !form.start_date || !form.end_date || !form.registration_deadline) return;
    setPosting(true); setPostMsg(null);
    try {
      const res = await fetch('/api/hackathons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, team_size_max: Number(form.team_size_max) })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPostMsg({ type: 'success', text: data.message });
        setForm({ title: '', description: '', tech_focus: '', start_date: '', end_date: '', registration_deadline: '', team_size_max: 4, posted_by: 'admin' });
        fetchHackathons();
        setTimeout(() => setActiveTab('browse'), 1500);
      } else {
        setPostMsg({ type: 'error', text: 'Failed to post hackathon.' });
      }
    } catch { setPostMsg({ type: 'error', text: 'Network error.' }); }
    finally { setPosting(false); }
  };

  // ── Admin: view applicants ─────────────────────────────────────────────────
  const handleViewApplicants = async (hackathon) => {
    setApplicantsLoading(true);
    setApplicantsModal({ hackathon, applicants: [] });
    try {
      const res = await fetch(`/api/hackathons/${hackathon.id}/applicants`);
      const data = await res.json();
      setApplicantsModal({ hackathon, applicants: data.applicants || [] });
    } catch { } finally { setApplicantsLoading(false); }
  };

  // ── Admin: delete hackathon ────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm('Delete this hackathon and all its registrations?')) return;
    await fetch(`/api/hackathons/${id}`, { method: 'DELETE' });
    fetchHackathons();
  };

  // ── Student: apply ─────────────────────────────────────────────────────────
  const handleApply = async () => {
    if (!applyModal) return;
    setApplying(true); setApplyMsg(null);
    try {
      const res = await fetch(`/api/hackathons/${applyModal.id}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, team_name: teamName || null })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setApplyMsg({ type: 'success', text: '🎉 ' + data.message });
        setTimeout(() => { setApplyModal(null); setTeamName(''); setApplyMsg(null); }, 2500);
      } else {
        setApplyMsg({ type: 'info', text: data.message });
      }
    } catch { setApplyMsg({ type: 'error', text: 'Network error.' }); }
    finally { setApplying(false); }
  };

  // ── Student: ideate via agent ──────────────────────────────────────────────
  const handleIdeate = async () => {
    if (!ideateModal) return;
    setIdeating(true); setIdeaResult('');
    try {
      // Call the student chat agent directly with the ideation request
      const fd = new FormData();
      fd.append('student_id', studentId);
      fd.append('query', `Use ideate_hackathon_tool for hackathon ID ${ideateModal.id}. My interests: ${interests || 'general tech'}`);
      const res = await fetch('/api/chat/student/multimodal', { method: 'POST', body: fd });
      const data = await res.json();
      setIdeaResult(data.reply || 'No ideas generated.');
    } catch { setIdeaResult('Agent error. Try again.'); }
    finally { setIdeating(false); }
  };

  const tagColor = (i) => ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'][i % 5];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg,#f59e0b 0%,#ef4444 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, background: 'rgba(255,255,255,0.2)',
            borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Trophy size={26} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Hackathon Hub</h2>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
              {isAdmin ? 'Manage hackathons and view registrations' : 'Discover, ideate, and register for hackathons'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{hackathons.length}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Open</div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[
          { id: 'browse', label: 'Browse Hackathons', icon: Trophy },
          ...(isAdmin ? [{ id: 'post', label: 'Post New', icon: Plus }] : [])
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`hackathon-tab-${id}`}
            onClick={() => setActiveTab(id)}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7,
              background: activeTab === id ? 'var(--amber)' : '#fff',
              color: activeTab === id ? '#fff' : 'var(--text-muted)',
              boxShadow: activeTab === id ? '0 2px 8px rgba(245,158,11,0.3)' : 'var(--shadow-sm)'
            }}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── Browse Tab ── */}
      {activeTab === 'browse' && (
        loading ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p>Loading hackathons...</p>
          </div>
        ) : hackathons.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center' }}>
            <Trophy size={48} color="var(--text-light)" style={{ marginBottom: 16 }} />
            <h3 style={{ margin: '0 0 8px', color: 'var(--text-dark)' }}>No Open Hackathons</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              {isAdmin ? 'Post a hackathon to get started.' : 'Check back soon — new hackathons are added regularly!'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {hackathons.map((h, i) => {
              const days = daysLeft(h.registration_deadline);
              const color = tagColor(i);
              return (
                <div key={h.id} className="card" style={{ padding: 24, borderTop: `4px solid ${color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text-dark)' }}>
                        {h.title}
                      </h3>
                      {h.tech_focus && (
                        <span style={{
                          display: 'inline-block', background: color + '15', color: color,
                          fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20
                        }}>{h.tech_focus}</span>
                      )}
                    </div>
                    <div style={{
                      background: days <= 3 ? 'var(--red-light)' : days <= 7 ? 'var(--amber-light)' : 'var(--green-light)',
                      color: days <= 3 ? '#991b1b' : days <= 7 ? '#92400e' : '#065f46',
                      fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20,
                      display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0
                    }}>
                      <Clock size={11} />
                      {days > 0 ? `${days}d left` : 'Closing today'}
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
                    {h.description?.slice(0, 150)}{h.description?.length > 150 ? '...' : ''}
                  </p>

                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Calendar size={12} /> {h.start_date} → {h.end_date}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Users size={12} /> Max {h.team_size_max} per team
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    {!isAdmin && (
                      <>
                        <button
                          id={`hackathon-register-${h.id}`}
                          onClick={() => { setApplyModal(h); setApplyMsg(null); setTeamName(''); }}
                          className="btn-primary"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                        >
                          <UserCheck size={14} /> Register
                        </button>
                        <button
                          id={`hackathon-ideate-${h.id}`}
                          onClick={() => { setIdeateModal(h); setIdeaResult(''); setInterests(''); }}
                          style={{
                            flex: 1, padding: '9px 0', borderRadius: 8, border: `1px solid ${color}`,
                            background: color + '10', color: color, fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7
                          }}
                        >
                          <Lightbulb size={14} /> Ideate
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          id={`hackathon-applicants-${h.id}`}
                          onClick={() => handleViewApplicants(h)}
                          className="btn-primary"
                          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
                        >
                          <Users size={14} /> Applicants
                        </button>
                        <button
                          onClick={() => handleDelete(h.id)}
                          style={{
                            padding: '9px 14px', borderRadius: 8, border: '1px solid var(--red-light)',
                            background: 'var(--red-light)', color: '#991b1b', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ── Post Tab (admin) ── */}
      {activeTab === 'post' && isAdmin && (
        <div className="card" style={{ padding: 32, maxWidth: 620 }}>
          <h3 style={{ margin: '0 0 24px', fontSize: 16, fontWeight: 700, color: 'var(--text-dark)' }}>
            Post New Hackathon
          </h3>
          <div style={{ display: 'grid', gap: 16 }}>
            {[
              { label: 'TITLE', key: 'title', placeholder: 'e.g. Smart India Hackathon 2026', type: 'text' },
              { label: 'TECH FOCUS', key: 'tech_focus', placeholder: 'e.g. AI, Web3, FinTech', type: 'text' },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</label>
                <input
                  id={`hackathon-form-${key}`}
                  type={type}
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-input)', fontSize: 14, outline: 'none' }}
                />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>DESCRIPTION</label>
              <textarea
                id="hackathon-form-description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What is this hackathon about?"
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-input)', fontSize: 14, outline: 'none', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {[
                { label: 'START DATE', key: 'start_date' },
                { label: 'END DATE', key: 'end_date' },
                { label: 'REG. DEADLINE', key: 'registration_deadline' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</label>
                  <input
                    id={`hackathon-form-${key}`}
                    type="date"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-input)', fontSize: 13, outline: 'none' }}
                  />
                </div>
              ))}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>MAX TEAM SIZE</label>
              <input
                id="hackathon-form-team_size_max"
                type="number" min={1} max={10}
                value={form.team_size_max}
                onChange={e => setForm(f => ({ ...f, team_size_max: e.target.value }))}
                style={{ width: 100, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-input)', fontSize: 14, outline: 'none' }}
              />
            </div>
          </div>

          <button
            id="hackathon-post-btn"
            className="btn-primary"
            onClick={handlePost}
            disabled={posting}
            style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            {posting ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
            {posting ? 'Posting...' : 'Post Hackathon'}
          </button>

          {postMsg && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: postMsg.type === 'success' ? 'var(--green-light)' : 'var(--red-light)',
              color: postMsg.type === 'success' ? '#065f46' : '#991b1b',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              {postMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {postMsg.text}
            </div>
          )}
        </div>
      )}

      {/* ── Register Modal ── */}
      {applyModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-dark)' }}>
                Register: {applyModal.title}
              </h3>
              <button onClick={() => setApplyModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {applyModal.tech_focus && (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                Tech Focus: <strong>{applyModal.tech_focus}</strong>
              </p>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                TEAM NAME (optional)
              </label>
              <input
                id="hackathon-apply-team-name"
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                placeholder="e.g. Team Phoenix"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-input)', fontSize: 14, outline: 'none' }}
              />
            </div>

            {applyMsg && (
              <div style={{
                marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: 13,
                background: applyMsg.type === 'success' ? 'var(--green-light)' : applyMsg.type === 'error' ? 'var(--red-light)' : 'var(--blue-light)',
                color: applyMsg.type === 'success' ? '#065f46' : applyMsg.type === 'error' ? '#991b1b' : '#0284c7',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                {applyMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {applyMsg.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                id="hackathon-apply-confirm-btn"
                className="btn-primary"
                onClick={handleApply}
                disabled={applying}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {applying ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserCheck size={14} />}
                {applying ? 'Registering...' : 'Confirm Registration'}
              </button>
              <button onClick={() => setApplyModal(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', color: 'var(--text-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Ideate Modal ── */}
      {ideateModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 680, padding: 32, margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lightbulb size={18} color="var(--amber)" /> AI Ideation: {ideateModal.title}
              </h3>
              <button onClick={() => setIdeateModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                YOUR INTERESTS / CONSTRAINTS (optional)
              </label>
              <input
                id="hackathon-ideate-interests"
                type="text"
                value={interests}
                onChange={e => setInterests(e.target.value)}
                placeholder="e.g. I like ML and want to build something social impact-focused"
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-input)', fontSize: 14, outline: 'none' }}
              />
            </div>

            <button
              id="hackathon-ideate-btn"
              className="btn-primary"
              onClick={handleIdeate}
              disabled={ideating}
              style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}
            >
              {ideating ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={14} />}
              {ideating ? 'AI is brainstorming...' : 'Generate Project Ideas'}
            </button>

            {ideaResult && (
              <div style={{
                background: 'var(--bg-app)', borderRadius: 10, padding: 20,
                fontSize: 13, color: 'var(--text-body)', lineHeight: 1.8,
                whiteSpace: 'pre-wrap', maxHeight: 420, overflowY: 'auto',
                border: '1px solid var(--border)'
              }}>
                {ideaResult}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Applicants Modal (admin) ── */}
      {applicantsModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 700, padding: 32, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-dark)' }}>
                {applicantsModal.hackathon.title} — Registrations ({applicantsModal.applicants.length})
              </h3>
              <button onClick={() => setApplicantsModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            {applicantsLoading ? (
              <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : applicantsModal.applicants.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>No registrations yet.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {['Student', 'Roll No', 'Branch', 'Team', 'Status', 'Registered'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applicantsModal.applicants.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-dark)' }}>{a.student_name || '—'}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{a.student_id}</td>
                      <td style={{ padding: '10px 12px' }}>{a.branch || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>{a.team_name || <span style={{ color: 'var(--text-light)' }}>Solo</span>}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          background: a.status === 'REGISTERED' ? 'var(--green-light)' : 'var(--red-light)',
                          color: a.status === 'REGISTERED' ? '#065f46' : '#991b1b',
                          fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20
                        }}>{a.status}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{a.applied_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
