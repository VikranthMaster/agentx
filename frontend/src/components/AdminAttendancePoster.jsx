import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, XCircle, UserCheck, RefreshCw } from 'lucide-react';

const PERIODS = [
  'Period 1 (9:00 – 10:00 AM)', 'Period 2 (10:00 – 11:00 AM)',
  'Period 3 (11:15 AM – 12:15 PM)', 'Period 4 (1:15 – 2:15 PM)',
  'Period 5 (2:15 – 3:15 PM)', 'Period 6 (3:15 – 4:15 PM)',
];

export default function AdminAttendancePoster({ user }) {
  const adminId = user?.id || 'admin';
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState(1);
  const [subject, setSubject] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [section, setSection] = useState('A');
  const [students, setStudents] = useState([]);
  const [selectedPresent, setSelectedPresent] = useState([]);
  const [statusMsg, setStatusMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStudents = (b, s) => {
    fetch(`/api/users`)
      .then(r => r.json())
      .then(data => {
        const list = (data.users || []).filter(u => u.role === 'student' && u.branch === b && u.section === s);
        setStudents(list);
        setSelectedPresent(list.map(x => x.id));
      })
      .catch(console.error);
  };

  useEffect(() => { fetchStudents(branch, section); }, [branch, section]);

  const toggle = (id) => setSelectedPresent(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim()) { setStatusMsg({ type: 'error', text: 'Subject name is required.' }); return; }
    setLoading(true); setStatusMsg(null);
    try {
      const res = await fetch('/api/attendance/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, period: parseInt(period), subject: subject.trim(), branch, section, posted_by: adminId, present_student_ids: selectedPresent })
      });
      const data = await res.json();
      setStatusMsg({ type: 'success', text: data.message || 'Attendance posted successfully.' });
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to post attendance.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '900px' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserCheck size={16} color="var(--blue)" />
          <span className="card-title">Post Period Attendance</span>
        </div>
        <button className="btn-secondary btn-sm" onClick={() => fetchStudents(branch, section)}>
          <RefreshCw size={12} /> Refresh Students
        </button>
      </div>

      <div className="card-body">
        {statusMsg && (
          <div className={`alert ${statusMsg.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '20px' }}>
            {statusMsg.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {statusMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" required />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Period</label>
              <select value={period} onChange={e => setPeriod(e.target.value)} className="input-field">
                {PERIODS.map((p, i) => <option key={i + 1} value={i + 1}>{p}</option>)}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="input-field" placeholder="e.g. System Design" required />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Branch</label>
              <select value={branch} onChange={e => setBranch(e.target.value)} className="input-field">
                <option>CSE</option><option>ECE</option><option>MECH</option><option>EEE</option><option>CIVIL</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Section</label>
              <select value={section} onChange={e => setSection(e.target.value)} className="input-field">
                <option value="A">Section A</option><option value="B">Section B</option><option value="C">Section C</option>
              </select>
            </div>
          </div>

          {/* Student toggle list */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Mark Attendance — {students.length} student(s) in {branch}-{section}
              </label>
              {students.length > 0 && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setSelectedPresent(students.map(s => s.id))}>All Present</button>
                  <button type="button" className="btn-secondary btn-sm" onClick={() => setSelectedPresent([])}>All Absent</button>
                </div>
              )}
            </div>

            {students.length === 0 ? (
              <div style={{ padding: '20px', background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                No students registered in {branch}-{section}. Register students first.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '8px' }}>
                {students.map(s => {
                  const present = selectedPresent.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggle(s.id)}
                      className={`att-card ${present ? 'present' : 'absent'}`}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-dark)' }}>{s.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.id}</div>
                      </div>
                      <span className={`badge ${present ? 'badge-present' : 'badge-absent'}`}>
                        {present ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {present ? 'Present' : 'Absent'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button type="submit" className="btn-primary" disabled={loading}>
              <Send size={14} /> {loading ? 'Posting...' : 'Post Attendance'}
            </button>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {selectedPresent.length} / {students.length} marked present
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
