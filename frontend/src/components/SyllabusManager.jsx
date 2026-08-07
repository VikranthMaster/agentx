import React, { useState, useEffect } from 'react';
import { BookOpen, Upload, Download, FileText, CheckCircle2 } from 'lucide-react';

export default function SyllabusManager({ role }) {
  const [syllabusList, setSyllabusList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);

  // Form State
  const [subject, setSubject] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [semester, setSemester] = useState(3);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchSyllabus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/syllabus/list');
      const data = await res.json();
      setSyllabusList(data.syllabus_list || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSyllabus();
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('subject', subject);
    formData.append('branch', branch);
    formData.append('semester', semester);
    formData.append('file', file);

    try {
      const res = await fetch('/api/syllabus/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.status === 'success') {
        setStatusMsg({ type: 'success', text: data.message });
        setSubject('');
        setFile(null);
        fetchSyllabus();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to upload syllabus PDF.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {statusMsg && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${statusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          color: statusMsg.type === 'success' ? '#34D399' : '#F87171',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={16} /> {statusMsg.text}
        </div>
      )}

      {/* Admin Upload Syllabus */}
      {role === 'admin' && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={20} color="var(--accent-primary)" /> Upload Course Syllabus PDF
          </h3>

          <form onSubmit={handleUpload} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Subject Name</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Machine Learning" className="input-field" required />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Branch</label>
              <select value={branch} onChange={e => setBranch(e.target.value)} className="input-field">
                <option value="CSE">CSE</option>
                <option value="ECE">ECE</option>
                <option value="MECH">MECH</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Semester</label>
              <select value={semester} onChange={e => setSemester(e.target.value)} className="input-field">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Select PDF Document</label>
              <input type="file" accept=".pdf" onChange={e => setFile(e.target.files[0])} className="input-field" required />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn-primary" disabled={uploading}>
                <Upload size={16} /> {uploading ? 'Uploading PDF...' : 'Upload Syllabus PDF'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Syllabus Repository List */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={20} color="var(--accent-cyan)" /> Official Course Syllabus Directory ({syllabusList.length})
        </h3>

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading syllabus files...</div>
        ) : syllabusList.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No syllabus PDFs uploaded yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {syllabusList.map(syl => (
              <div key={syl.id} style={{ background: '#0D131F', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="badge badge-cyan">{syl.branch}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sem {syl.semester}</span>
                  </div>

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>{syl.subject}</h4>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                    <FileText size={14} color="var(--accent-primary)" /> PDF Document
                  </div>
                </div>

                <a
                  href={`/api/syllabus/download/${syl.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}
                >
                  <Download size={16} /> Download Syllabus PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
