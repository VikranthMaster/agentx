import React, { useState, useEffect, useRef } from 'react';
import {
  Target, Zap, TrendingUp, BookOpen, CheckCircle2,
  AlertCircle, RefreshCw, ArrowRight, Star, Download,
  ChevronDown, ChevronUp, BarChart2, Map
} from 'lucide-react';

export default function PlacementIntelligence({ studentId }) {
  const storageKey = `smart_campus_intel_state_${studentId || 'default'}`;

  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [selectedJob, setSelectedJob] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).selectedJob || null : null;
    } catch { return null; }
  });

  const [fitResult, setFitResult] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).fitResult || null : null;
    } catch { return null; }
  });

  const [roadmapResult, setRoadmapResult] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).roadmapResult || '' : '';
    } catch { return ''; }
  });

  const [roadmapTopic, setRoadmapTopic] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved).roadmapTopic || '' : '';
    } catch { return ''; }
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [expandedRoadmap, setExpandedRoadmap] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        selectedJob, fitResult, roadmapTopic, roadmapResult
      }));
    } catch {}
  }, [selectedJob, fitResult, roadmapTopic, roadmapResult, storageKey]);

  useEffect(() => {
    fetch('/api/jobs')
      .then(r => r.json())
      .then(d => setJobs(d.jobs || []))
      .catch(() => {})
      .finally(() => setLoadingJobs(false));
  }, []);

  const analyzeFit = async (job) => {
    setSelectedJob(job);
    setFitResult(null);
    setRoadmapResult('');
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/fit-check?student_id=${encodeURIComponent(studentId)}`, {
        method: 'POST'
      });
      const data = await res.json();
      setFitResult(data);
    } catch {
      setFitResult({ status: 'error', analysis: 'Network error. Please try again.' });
    } finally {
      setAnalyzing(false);
    }
  };

  const generateRoadmap = async () => {
    if (!fitResult) return;
    setGeneratingRoadmap(true);
    setRoadmapResult('');
    setExpandedRoadmap(false);

    const topic = roadmapTopic.trim() || `${selectedJob?.title} skills`;
    try {
      const fd = new FormData();
      fd.append('student_id', studentId);
      fd.append('query', `Generate a learning roadmap for: ${topic}. Focus on helping me close skill gaps for ${selectedJob?.title} at ${selectedJob?.company}.`);
      const res = await fetch('/api/chat/student/multimodal', { method: 'POST', body: fd });
      const data = await res.json();
      setRoadmapResult(data.reply || 'Could not generate roadmap.');
      setExpandedRoadmap(true);
    } catch {
      setRoadmapResult('Agent error. Please try again.');
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  // Parse fit_score from analysis text (the backend embeds it in brackets)
  const parseFitScore = (analysis) => {
    if (!analysis) return null;
    const m = analysis.match(/fit_score=(\d+)/);
    return m ? parseInt(m[1]) : null;
  };

  const parseMissingSkills = (analysis) => {
    if (!analysis) return [];
    const m = analysis.match(/missing_skills=\[([^\]]*)\]/);
    if (!m) return [];
    return m[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
  };

  const scoreColor = (s) =>
    s >= 75 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';

  const scoreBg = (s) =>
    s >= 75 ? 'var(--green-light)' : s >= 50 ? 'var(--amber-light)' : 'var(--red-light)';

  const scoreLabel = (s) =>
    s >= 75 ? 'Great Fit ✅' : s >= 50 ? 'Partial Fit ⚠️' : 'Skill Gap 🔴';

  return (
    <div style={{ maxWidth: 980, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{
        background: 'linear-gradient(135deg,#10b981 0%,#0ea5e9 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 48, height: 48, background: 'rgba(255,255,255,0.2)',
            borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Target size={26} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Placement Intelligence</h2>
            <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
              Deterministic fit analysis — no AI guessing, only your actual skills vs. job requirements
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── Job Picker ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-app)' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-dark)' }}>
              Select a Job to Analyse
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Click any job to run an instant fit-check against your resume skills
            </p>
          </div>
          <div style={{ maxHeight: 460, overflowY: 'auto' }}>
            {loadingJobs ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : jobs.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No jobs available yet.
              </div>
            ) : (
              jobs.map(job => (
                <button
                  key={job.id}
                  id={`fit-check-job-${job.id}`}
                  onClick={() => analyzeFit(job)}
                  style={{
                    width: '100%', padding: '14px 20px', textAlign: 'left', border: 'none',
                    borderBottom: '1px solid var(--border)', cursor: 'pointer',
                    background: selectedJob?.id === job.id ? 'var(--blue-light)' : 'transparent',
                    borderLeft: selectedJob?.id === job.id ? '3px solid var(--blue)' : '3px solid transparent',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={e => { if (selectedJob?.id !== job.id) e.currentTarget.style.background = 'var(--bg-app)'; }}
                  onMouseOut={e => { if (selectedJob?.id !== job.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 3 }}>
                    {job.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {job.company} · {job.branch || 'All branches'}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Result Panel ── */}
        <div>
          {!selectedJob && !analyzing && (
            <div className="card" style={{ padding: 60, textAlign: 'center' }}>
              <Target size={48} color="var(--text-light)" style={{ marginBottom: 16 }} />
              <h3 style={{ margin: '0 0 8px', color: 'var(--text-dark)' }}>Pick a Job</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 280, margin: '0 auto' }}>
                Select any job from the list to run an instant deterministic fit-check against your parsed resume.
              </p>
            </div>
          )}

          {analyzing && (
            <div className="card" style={{ padding: 60, textAlign: 'center' }}>
              <RefreshCw size={36} color="var(--blue)" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
              <h3 style={{ margin: '0 0 8px', color: 'var(--text-dark)' }}>Analysing...</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Comparing your resume skills against {selectedJob?.title} at {selectedJob?.company}
              </p>
            </div>
          )}

          {fitResult && !analyzing && (() => {
            const isSuccess = fitResult.status !== 'error';
            const score = fitResult.fit_score !== undefined ? fitResult.fit_score : parseFitScore(fitResult.analysis || '');
            const missing = fitResult.missing_skills !== undefined ? fitResult.missing_skills : parseMissingSkills(fitResult.analysis || '');
            const displayText = fitResult.verdict || (fitResult.analysis || '').replace(/\[fit_score=.*?\]$/s, '').trim();

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Score Card */}
                <div className="card" style={{ padding: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--text-dark)' }}>
                        {selectedJob?.title}
                      </h3>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{selectedJob?.company}</p>
                    </div>
                    {score !== null && isSuccess && (
                      <div style={{
                        background: scoreBg(score), color: scoreColor(score),
                        borderRadius: 14, padding: '14px 20px', textAlign: 'center',
                        border: `2px solid ${scoreColor(score)}30`
                      }}>
                        <div style={{ fontSize: 32, fontWeight: 800 }}>{score}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>/ 100</div>
                        <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{scoreLabel(score)}</div>
                      </div>
                    )}
                  </div>

                  {/* Score bar */}
                  {score !== null && isSuccess && (
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                        <span>Fit Score</span><span>{score}/100</span>
                      </div>
                      <div style={{ height: 10, background: '#e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${score}%`,
                          background: `linear-gradient(90deg, ${scoreColor(score)}, ${scoreColor(score)}cc)`,
                          borderRadius: 10, transition: 'width 0.8s ease'
                        }} />
                      </div>
                    </div>
                  )}

                  <p style={{ fontSize: 14, color: 'var(--text-body)', lineHeight: 1.7, margin: 0 }}>
                    {!isSuccess ? (fitResult.message || fitResult.analysis) : displayText}
                  </p>
                </div>

                {/* Missing Skills */}
                {missing.length > 0 && (
                  <div className="card" style={{ padding: 24 }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertCircle size={16} color="#ef4444" /> Skills to Develop
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {missing.map(skill => (
                        <span key={skill} style={{
                          background: 'var(--red-light)', color: '#991b1b',
                          fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20
                        }}>{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Roadmap Generator */}
                <div className="card" style={{ padding: 24 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Map size={16} color="var(--purple)" /> Generate Learning Roadmap
                  </h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
                    {missing.length > 0
                      ? `Close the ${missing.length} skill gap${missing.length > 1 ? 's' : ''} above with a personalised, curriculum-aware roadmap.`
                      : 'Already a strong fit! Generate an advanced roadmap to further sharpen your edge.'}
                  </p>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                    <input
                      id="roadmap-topic-input"
                      type="text"
                      value={roadmapTopic}
                      onChange={e => setRoadmapTopic(e.target.value)}
                      placeholder={missing.length > 0 ? `e.g. ${missing[0]}` : `e.g. ${selectedJob?.title} interview prep`}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 8,
                        border: '1px solid var(--border-input)', fontSize: 14, outline: 'none'
                      }}
                    />
                    <button
                      id="generate-roadmap-btn"
                      className="btn-primary"
                      onClick={generateRoadmap}
                      disabled={generatingRoadmap}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
                    >
                      {generatingRoadmap
                        ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        : <Zap size={14} />}
                      {generatingRoadmap ? 'Generating...' : 'Build Roadmap'}
                    </button>
                  </div>

                  {roadmapResult && (
                    <div>
                      <button
                        onClick={() => setExpandedRoadmap(!expandedRoadmap)}
                        style={{
                          width: '100%', padding: '10px 16px', borderRadius: 8,
                          border: '1px solid var(--border)', background: 'var(--bg-app)',
                          fontSize: 13, fontWeight: 600, color: 'var(--text-dark)',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <BookOpen size={14} color="var(--purple)" /> Your Personalised Roadmap
                        </span>
                        {expandedRoadmap ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {expandedRoadmap && (
                        <div style={{
                          marginTop: 12, padding: '20px 24px', background: 'var(--bg-app)',
                          borderRadius: 10, fontSize: 13, color: 'var(--text-body)',
                          lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 500, overflowY: 'auto',
                          border: '1px solid var(--border)'
                        }}>
                          {roadmapResult}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
