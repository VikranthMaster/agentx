import React, { useState } from 'react';
import { GraduationCap, Eye, EyeOff, AlertCircle, Loader } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username_or_id: id.trim(), password: password.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onLoginSuccess(data.user);
      } else {
        setError(data.detail || data.error || 'Invalid credentials');
      }
    } catch {
      setError('Cannot connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div style={{ width: '100%', maxWidth: '420px', padding: '16px' }}>
        <div className="login-box">
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">SC</div>
            <div>
              <div className="login-title">Smart Campus ERP</div>
              <div className="login-sub">Sign in to your account</div>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '20px' }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Username / Roll Number</label>
              <input
                id="login-id"
                type="text"
                className="input-field"
                placeholder="admin or 1602-24-733-160"
                value={id}
                onChange={e => setId(e.target.value)}
                required
                autoFocus
              />
              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                Admin: <strong>admin</strong> &nbsp;|&nbsp; Student: roll number
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '38px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '4px' }}>
                Admin: <strong>admin123</strong> &nbsp;|&nbsp; Student: <strong>student</strong>
              </div>
            </div>

            <button id="login-btn" type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px', marginTop: '8px' }} disabled={loading}>
              {loading ? <><Loader size={14} className="spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '24px', padding: '14px', background: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-body)' }}>Quick Access</strong>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span>🔑 Admin: <code>admin</code> / <code>admin123</code></span>
              <span>🎓 Student: roll number / <code>student</code></span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#94A3B8' }}>
          Smart Campus ERP · Powered by LangChain + Groq AI
        </div>
      </div>
    </div>
  );
}
