import React, { useState, useEffect } from 'react';
import { RefreshCw, Calendar, CheckCircle, XCircle, Percent } from 'lucide-react';

export default function StudentAttendance({ studentId }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/attendance/student/${encodeURIComponent(studentId)}`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch {
      setError('Failed to load attendance data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [studentId]);

  const total = records.length;
  const present = records.filter(r => r.status === 'PRESENT').length;
  const absent = total - present;
  const pct = total ? Math.round((present / total) * 100) : 0;

  // Group by subject
  const bySubject = {};
  records.forEach(r => {
    if (!bySubject[r.subject]) bySubject[r.subject] = { present: 0, total: 0 };
    bySubject[r.subject].total++;
    if (r.status === 'PRESENT') bySubject[r.subject].present++;
  });

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '20px' }}>
        <div className="stat-card">
          <div className="stat-icon blue"><Percent size={18} /></div>
          <div>
            <div className="stat-value">{pct}%</div>
            <div className="stat-label">Overall Attendance</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CheckCircle size={18} /></div>
          <div>
            <div className="stat-value">{present}</div>
            <div className="stat-label">Present Periods</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><XCircle size={18} /></div>
          <div>
            <div className="stat-value">{absent}</div>
            <div className="stat-label">Absent Periods</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><Calendar size={18} /></div>
          <div>
            <div className="stat-value">{total}</div>
            <div className="stat-label">Total Periods</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Subject-wise breakdown */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Subject-wise Attendance</span>
            <button className="btn-secondary btn-sm" onClick={load}><RefreshCw size={12} /> Refresh</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {Object.keys(bySubject).length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No attendance records yet.
              </div>
            ) : (
              <table className="erp-table">
                <thead>
                  <tr><th>Subject</th><th>Present</th><th>Total</th><th>%</th></tr>
                </thead>
                <tbody>
                  {Object.entries(bySubject).map(([sub, v]) => {
                    const p = Math.round((v.present / v.total) * 100);
                    return (
                      <tr key={sub}>
                        <td style={{ fontWeight: 500 }}>{sub}</td>
                        <td>{v.present}</td>
                        <td>{v.total}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '5px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden', minWidth: '60px' }}>
                              <div style={{ width: `${p}%`, height: '100%', background: p >= 75 ? 'var(--green)' : p >= 60 ? 'var(--amber)' : 'var(--red)', transition: 'width 0.4s' }} />
                            </div>
                            <span style={{ fontWeight: 600, color: p >= 75 ? 'var(--green)' : p >= 60 ? 'var(--amber)' : 'var(--red)', fontSize: '12px', minWidth: '32px' }}>{p}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Period-wise records */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Period Records (Recent First)</span>
          </div>
          <div style={{ overflowX: 'auto', maxHeight: '360px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
            ) : error ? (
              <div className="alert alert-error" style={{ margin: '16px' }}>{error}</div>
            ) : records.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No attendance records found for your roll number.
              </div>
            ) : (
              <table className="erp-table">
                <thead>
                  <tr><th>Date</th><th>Period</th><th>Subject</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {[...records].reverse().map((r, i) => (
                    <tr key={i}>
                      <td style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                      <td>P{r.period}</td>
                      <td>{r.subject}</td>
                      <td>
                        <span className={`badge ${r.status === 'PRESENT' ? 'badge-present' : 'badge-absent'}`}>
                          {r.status === 'PRESENT' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
