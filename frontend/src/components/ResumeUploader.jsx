import React, { useState, useEffect } from 'react';
import { Upload, FileText, Sparkles, CheckCircle, AlertCircle, Percent, Trophy, Code, Award, ExternalLink } from 'lucide-react';

export default function ResumeUploader({ studentId }) {
  const [file, setFile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);

  const loadResumeProfile = async () => {
    setFetching(true);
    try {
      const res = await fetch(`/api/resume/student/${encodeURIComponent(studentId)}`);
      const data = await res.json();
      if (data.has_resume && data.profile) {
        setProfile(data.profile.parsed_json || data.profile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Failed to load resume profile:', err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (studentId) loadResumeProfile();
  }, [studentId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('student_id', studentId);
    formData.append('file', file);

    try {
      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        setProfile(data.profile);
        setStatusMsg({ type: 'success', text: 'Resume uploaded and parsed successfully by Groq LLM Agent!' });
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'Upload failed.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to upload and parse resume.' });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading resume profile...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Upload Card */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={16} color="var(--blue)" />
            <span className="card-title">Upload Resume & Extract ATS Profile</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PDF or DOCX</span>
        </div>

        <div className="card-body">
          {statusMsg && (
            <div className={`alert ${statusMsg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {statusMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {statusMsg.text}
            </div>
          )}

          <form onSubmit={handleUpload} style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={e => setFile(e.target.files[0])}
              className="input-field"
              style={{ flex: 1, minWidth: '240px' }}
              required
            />
            <button type="submit" className="btn-primary" disabled={loading}>
              <Sparkles size={14} /> {loading ? 'Parsing with AI Agent...' : 'Parse Resume & Save Profile'}
            </button>
          </form>
        </div>
      </div>

      {/* Parsed Profile Display */}
      {profile && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top Overview Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue"><Percent size={20} /></div>
              <div>
                <div className="stat-value" style={{ color: (profile.resume_score || 0) >= 80 ? 'var(--green)' : 'var(--amber)' }}>
                  {profile.resume_score || 80}/100
                </div>
                <div className="stat-label">ATS Resume Score</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon purple"><Trophy size={20} /></div>
              <div>
                <div className="stat-value" style={{ fontSize: '16px', fontWeight: 700 }}>
                  {profile.domain || 'Software Engineering'}
                </div>
                <div className="stat-label">Detected Domain</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green"><Code size={20} /></div>
              <div>
                <div className="stat-value" style={{ fontSize: '18px', fontWeight: 700 }}>
                  {(profile.skills || []).length} Skills
                </div>
                <div className="stat-label">Extracted Technical Skills</div>
              </div>
            </div>
          </div>

          {/* Recruiter Evaluation Feedback */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="var(--blue)" />
                <span className="card-title">Interviewer & AI Recruiter Feedback</span>
              </div>
            </div>
            <div className="card-body">
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-body)' }}>
                {profile.analysis || 'Candidate demonstrates solid technical background.'}
              </p>
            </div>
          </div>

          {/* Extracted Skills Badges */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Extracted Skills</span>
            </div>
            <div className="card-body" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(profile.skills || []).length === 0 ? (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No explicit skills list found.</span>
              ) : (
                (profile.skills || []).map((sk, idx) => (
                  <span key={idx} className="badge badge-blue" style={{ fontSize: '12px', padding: '5px 12px' }}>
                    {typeof sk === 'string' ? sk : sk.skill_name || sk}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
