import React, { useState } from 'react';
import { FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminExamAssessor() {
  const [rubric, setRubric] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleAssess = async () => {
    if (!file || !rubric.trim()) {
      setError("Please provide both a grading rubric and an answer sheet.");
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    const fd = new FormData();
    fd.append('rubric', rubric);
    fd.append('answer_sheet', file);

    try {
      const res = await fetch('/api/exam/assess', { method: 'POST', body: fd });
      const data = await res.json();
      
      if (data.status === 'success') {
        setResult(data.assessment);
      } else {
        setError(data.message || 'Assessment failed');
      }
    } catch (e) {
      setError('Server error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', height: '100%', overflowY: 'auto' }}>
      
      {/* Form Section */}
      <div style={{ background: 'var(--bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
        <h2 style={{ marginTop: 0, marginBottom: '20px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={22} color="var(--accent-cyan)" /> Exam & Notes Assessor (OCR)
        </h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-main)', fontSize: '14px' }}>
            Grading Rubric / Answer Key
          </label>
          <textarea
            value={rubric}
            onChange={e => setRubric(e.target.value)}
            placeholder="e.g. Q1 (5 marks): Mention NVIDIA Jetson Orin (2m), Power Distribution (2m), Battery (1m)..."
            rows={5}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-body)', color: 'var(--text-main)', fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-main)', fontSize: '14px' }}>
            Student Answer Sheet (Image or PDF)
          </label>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={e => setFile(e.target.files[0])}
            style={{ display: 'block', width: '100%', padding: '12px', border: '1px dashed var(--border-color)', borderRadius: '8px', background: 'var(--bg-body)', color: 'var(--text-main)' }}
          />
        </div>

        {error && (
          <div style={{ color: '#EF4444', background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16}/> {error}
          </div>
        )}

        <button 
          onClick={handleAssess} 
          disabled={loading} 
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', width: '100%', justifyContent: 'center' }}
        >
          {loading ? (
            <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Extracting OCR & Grading...</>
          ) : (
            <><CheckCircle size={18} /> Assess Answer Sheet</>
          )}
        </button>
      </div>

      {/* Results Section */}
      {result && (
        <div style={{ background: '#0F172A', padding: '24px', borderRadius: '12px', border: '1px solid #1E293B', color: '#F8FAFC' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Final Assessment
            </h3>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '1.1rem' }}>
              Score: {result.total_score} / {result.total_possible}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: '#94A3B8', marginBottom: '8px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Overall Feedback</h4>
            <p style={{ margin: 0, lineHeight: '1.6', fontSize: '15px' }}>{result.overall_feedback}</p>
          </div>

          <h4 style={{ color: '#94A3B8', marginBottom: '12px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Question Breakdown</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {result.per_question.map((q, i) => (
              <div key={i} style={{ background: '#1E293B', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <strong style={{ color: '#38BDF8', fontSize: '15px' }}>Question {q.question_number}</strong>
                  <span style={{ fontWeight: 'bold', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '14px' }}>
                    {q.marks_awarded} / {q.marks_total} pts
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: '1.5' }}>{q.feedback}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}