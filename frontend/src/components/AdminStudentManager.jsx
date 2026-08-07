import React, { useState, useEffect } from 'react';
import { UserPlus, Users, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

export default function AdminStudentManager() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [form, setForm] = useState({ roll_no: '', name: '', email: '', branch: 'CSE', section: 'A', year: 1 });

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/users');
      const d = await r.json();
      setStudents((d.users || []).filter(u => u.role === 'student'));
    } catch { setStudents([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setMsg(null);
    try {
      const res = await fetch('/api/students/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roll_no: form.roll_no, name: form.name, email: form.email, branch: form.branch, section: form.section, year: parseInt(form.year) })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg({ type: 'success', text: `${form.name} registered. Default password: student` });
        setForm({ roll_no: '', name: '', email: '', branch: 'CSE', section: 'A', year: 1 });
        load();
      } else {
        setMsg({ type: 'error', text: data.detail || 'Registration failed.' });
      }
    } catch { setMsg({ type: 'error', text: 'Server error.' }); }
    finally { setSubmitting(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', alignItems: 'start' }}>
      {/* Register Form */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={15} color="var(--blue)" />
            <span className="card-title">Register New Student</span>
          </div>
        </div>
        <div className="card-body">
          {msg && (
            <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {msg.type === 'success' ? <CheckCircle size={13} /> : <XCircle size={13} />} {msg.text}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Roll Number *</label>
              <input name="roll_no" value={form.roll_no} onChange={handleChange} className="input-field" placeholder="1602-24-733-160" required />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>Format: 1602-YY-BRC-SRN</div>
            </div>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="Student full name" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="email" value={form.email} onChange={handleChange} className="input-field" placeholder="student@college.edu" type="email" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Branch *</label>
                <select name="branch" value={form.branch} onChange={handleChange} className="input-field">
                  <option>CSE</option><option>ECE</option><option>MECH</option><option>EEE</option><option>CIVIL</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Section *</label>
                <select name="section" value={form.section} onChange={handleChange} className="input-field">
                  <option value="A">A</option><option value="B">B</option><option value="C">C</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Year of Study *</label>
              <select name="year" value={form.year} onChange={handleChange} className="input-field">
                <option value={1}>1st Year</option><option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option><option value={4}>4th Year</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
              <UserPlus size={14} /> {submitting ? 'Registering...' : 'Register Student'}
            </button>
          </form>
        </div>
      </div>

      {/* Students Table */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={15} color="var(--blue)" />
            <span className="card-title">Registered Students ({students.length})</span>
          </div>
          <button className="btn-secondary btn-sm" onClick={load}><RefreshCw size={12} /> Refresh</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading...</div>
          ) : students.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No students registered yet. Use the form to add students.
            </div>
          ) : (
            <table className="erp-table">
              <thead>
                <tr>
                  <th>Roll Number</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Branch</th>
                  <th>Section</th>
                  <th>Year</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td><code style={{ fontSize: '12px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>{s.id}</code></td>
                    <td style={{ fontWeight: 500 }}>{s.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.email || '—'}</td>
                    <td><span className="badge badge-blue">{s.branch}</span></td>
                    <td>{s.section}</td>
                    <td>Year {s.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
