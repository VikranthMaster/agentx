import React, { useState, useEffect } from 'react';
import { Users, RefreshCw, ExternalLink, CheckCircle } from 'lucide-react';

export default function AdminApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/jobs/applications');
      const d = await r.json();
      setApps(d.applications || []);
    } catch { setApps([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (appId, status) => {
    try {
      await fetch(`/api/jobs/applications/${appId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      load();
    } catch { alert('Failed to update status.'); }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={15} color="var(--blue)" />
          <span className="card-title">Candidate Applications ({apps.length})</span>
        </div>
        <button className="btn-secondary btn-sm" onClick={load}><RefreshCw size={12} /> Refresh</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading applications...</div>
        ) : apps.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            No applications submitted yet.
          </div>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Job Title</th>
                <th>Company</th>
                <th>Applicant</th>
                <th>Roll No</th>
                <th>Status</th>
                <th>Applied At</th>
                <th>Tailored Resume</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a, i) => (
                <tr key={a.id}>
                  <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 500 }}>{a.title || a.job_title || '—'}</td>
                  <td>{a.company || '—'}</td>
                  <td>{a.student_name || a.name || '—'}</td>
                  <td><code style={{ fontSize: '11px', background: '#F1F5F9', padding: '2px 5px', borderRadius: '3px' }}>{a.student_id || a.roll_no || '—'}</code></td>
                  <td>
                    <span className={`badge ${
                      a.status === 'SHORTLISTED' ? 'badge-green' :
                      a.status === 'REJECTED' ? 'badge-red' : 'badge-amber'
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: '12px' }}>
                    {a.applied_at ? a.applied_at.slice(0, 10) : '—'}
                  </td>
                  <td>
                    {a.tailored_resume_path ? (
                      <a
                        href={`/api/resume/tailored/${a.tailored_resume_path.split('/').pop()}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        <ExternalLink size={11} /> View
                      </a>
                    ) : <span style={{ color: 'var(--text-light)', fontSize: '12px' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {a.status !== 'SHORTLISTED' && (
                        <button className="btn-primary btn-sm" onClick={() => updateStatus(a.id, 'SHORTLISTED')}>
                          <CheckCircle size={11} /> Shortlist
                        </button>
                      )}
                      {a.status !== 'REJECTED' && (
                        <button className="btn-danger btn-sm" onClick={() => updateStatus(a.id, 'REJECTED')}>
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
