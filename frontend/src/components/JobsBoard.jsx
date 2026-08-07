import React, { useState, useEffect } from 'react';
import {
  Briefcase, Building, Send, CheckCircle2, Plus, Calendar, Users, Eye,
  X, Sparkles, FileText, Check, AlertCircle, Clock, Award, ChevronRight
} from 'lucide-react';

export default function JobsBoard({ role, studentId }) {
  const isAdmin = role === 'admin';
  const [activeTab, setActiveTab] = useState('drives'); // 'drives' | 'my_apps' | 'post'
  const [jobs, setJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState(null);

  // Modal States
  const [previewData, setPreviewData] = useState(null); // { job, tailored_file, tailored_url, match_score, matched_skills }
  const [tailoringLoading, setTailoringLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [viewApplicantsJob, setViewApplicantsJob] = useState(null); // { job, applicants: [] }
  const [applicantsLoading, setApplicantsLoading] = useState(false);

  // Admin Job Form State
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [posting, setPosting] = useState(false);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyApplications = async () => {
    if (!studentId || isAdmin) return;
    try {
      const res = await fetch(`/api/jobs/my-applications/${encodeURIComponent(studentId)}`);
      const data = await res.json();
      setMyApplications(data.applications || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchJobs();
    if (!isAdmin && studentId) {
      fetchMyApplications();
    }
  }, [studentId, role]);

  // Step 1: Generate Tailored Resume Preview
  const handleStartApply = async (job) => {
    setStatusMsg(null);
    setTailoringLoading(job.id);
    try {
      const res = await fetch('/api/jobs/tailor-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: job.id, student_id: studentId })
      });
      const data = await res.json();
      if (data.status === 'already_applied') {
        setStatusMsg({ type: 'info', text: data.message });
      } else if (data.status === 'error') {
        setStatusMsg({ type: 'error', text: data.message });
      } else if (data.status === 'success') {
        setPreviewData({ job, ...data });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to generate tailored resume preview.' });
    } finally {
      setTailoringLoading(false);
    }
  };

  // Step 2: Confirm and Submit Application
  const handleConfirmSubmit = async () => {
    if (!previewData) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/jobs/apply-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: previewData.job_id,
          student_id: studentId,
          tailored_file: previewData.tailored_file
        })
      });
      const data = await res.json();
      if (data.status === 'success' || data.status === 'already_applied') {
        setStatusMsg({ type: 'success', text: data.message });
        setPreviewData(null);
        fetchJobs();
        fetchMyApplications();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Error confirming application.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Applicants List Modal
  const handleOpenApplicants = async (job) => {
    setViewApplicantsJob({ job, applicants: [] });
    setApplicantsLoading(true);
    try {
      const res = await fetch(`/api/jobs/${job.id}/applicants`);
      const data = await res.json();
      setViewApplicantsJob({ job, applicants: data.applicants || [] });
    } catch (err) {
      console.error(err);
    } finally {
      setApplicantsLoading(false);
    }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    setPosting(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          company,
          description,
          requirements,
          branch,
          posted_by: 'admin',
          create_calendar_event: true
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setStatusMsg({ type: 'success', text: data.message });
        setTitle('');
        setCompany('');
        setDescription('');
        setRequirements('');
        setActiveTab('drives');
        fetchJobs();
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Failed to post job.' });
    } finally {
      setPosting(false);
    }
  };

  const isJobApplied = (jobId) => {
    return myApplications.some(app => app.job_id === jobId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sub Header Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn-sm ${activeTab === 'drives' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('drives')}
          >
            <Briefcase size={14} /> Open Placement Drives ({jobs.length})
          </button>

          {!isAdmin && (
            <button
              className={`btn-sm ${activeTab === 'my_apps' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setActiveTab('my_apps'); fetchMyApplications(); }}
            >
              <FileText size={14} /> My Applications ({myApplications.length})
            </button>
          )}

          {isAdmin && (
            <button
              className={`btn-sm ${activeTab === 'post' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('post')}
            >
              <Plus size={14} /> Post Placement Drive
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <div className={`alert ${statusMsg.type === 'success' ? 'alert-success' : statusMsg.type === 'info' ? 'alert-info' : 'alert-error'}`}>
          {statusMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
          {statusMsg.text}
        </div>
      )}

      {/* Admin Post Job Form */}
      {isAdmin && activeTab === 'post' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Post New Placement Drive & Sync Google Calendar</span>
          </div>
          <div className="card-body">
            <form onSubmit={handlePostJob} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <label className="label">Job Title</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. AI / ML Developer Intern" className="input-field" required />
              </div>

              <div>
                <label className="label">Company Name</label>
                <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Google Cloud / Service Now" className="input-field" required />
              </div>

              <div>
                <label className="label">Eligible Branch</label>
                <select value={branch} onChange={e => setBranch(e.target.value)} className="input-field">
                  <option value="CSE">CSE / IT</option>
                  <option value="CSE (AI/ML)">CSE (AI/ML)</option>
                  <option value="ECE">ECE</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">Job Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="input-field" placeholder="Role overview & responsibilities..." required />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label className="label">Requirements & Tech Stack</label>
                <input type="text" value={requirements} onChange={e => setRequirements(e.target.value)} placeholder="e.g. Python, FastAPI, React, SQL, DSA, Min 8.0 CGPA" className="input-field" required />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <button type="submit" className="btn-primary" disabled={posting}>
                  <Send size={14} /> {posting ? 'Publishing Drive...' : 'Publish Job & Create Google Calendar Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student: My Submitted Applications View */}
      {!isAdmin && activeTab === 'my_apps' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">My Submitted Applications ({myApplications.length})</span>
          </div>

          {myApplications.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              You haven't submitted any job applications yet.
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Applied Date</th>
                    <th>Tailored Resume</th>
                  </tr>
                </thead>
                <tbody>
                  {myApplications.map(app => (
                    <tr key={app.application_id}>
                      <td style={{ fontWeight: 600 }}>{app.job_title}</td>
                      <td>{app.company}</td>
                      <td>
                        {(() => {
                          const STATUS_LABEL = { APPLIED: 'Under Review', SHORTLISTED: 'Accepted', REJECTED: 'Rejected' };
                          const badgeClass = app.status === 'SHORTLISTED' ? 'badge-green' : app.status === 'REJECTED' ? 'badge-red' : 'badge-blue';
                          return (
                            <span className={`badge ${badgeClass}`}>
                              {STATUS_LABEL[app.status] || app.status}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td>
                        {app.tailored_resume_path ? (
                          <a
                            href={`/api/resume/tailored/${app.tailored_resume_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <FileText size={12} /> View ATS Tailored Resume
                          </a>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Standard Resume</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Available Placement Drives Grid */}
      {activeTab === 'drives' && (
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={16} color="var(--blue)" />
              <span className="card-title">Open Placement Drives ({jobs.length})</span>
            </div>
          </div>

          <div className="card-body">
            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading open drives...</div>
            ) : jobs.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No open placement drives posted yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {jobs.map(job => {
                  const applied = isJobApplied(job.id);
                  const isTailoring = tailoringLoading === job.id;

                  return (
                    <div
                      key={job.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        justify: 'space-between',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div>
                        {/* Top row badges */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span className="badge badge-blue">{job.branch || 'CSE'}</span>
                          
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleOpenApplicants(job)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '3px 8px' }}
                            title="View all candidates who applied for this drive"
                          >
                            <Users size={12} color="var(--blue)" />
                            <span>{job.applicant_count || 0} Applicants</span>
                          </button>
                        </div>

                        <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' }}>{job.title}</h4>
                        <div style={{ fontSize: '13px', color: 'var(--blue)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                          <Building size={14} /> {job.company}
                        </div>

                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.5' }}>
                          {job.description}
                        </p>

                        <div style={{ background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', fontSize: '12px', color: 'var(--text-dark)', marginBottom: '12px' }}>
                          <strong style={{ color: 'var(--text-dark)' }}>Requirements:</strong> {job.requirements}
                        </div>

                        {job.calendar_link && (
                          <div style={{ marginBottom: '12px' }}>
                            <a
                              href={job.calendar_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '12px', color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontWeight: 600 }}
                            >
                              <Calendar size={13} /> Google Calendar Drive Event
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      {!isAdmin && (
                        <button
                          onClick={() => handleStartApply(job)}
                          className={applied ? 'btn-secondary' : 'btn-primary'}
                          disabled={applied || isTailoring}
                          style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                        >
                          {applied ? (
                            <>
                              <CheckCircle2 size={14} color="var(--green)" /> Application Submitted
                            </>
                          ) : isTailoring ? (
                            <>
                              <Sparkles size={14} className="spin" /> Generating ATS Tailored Resume...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} /> Tailor Resume & Apply
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Step 2 Tailored Resume Preview & Application Confirmation Modal */}
      {previewData && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Review ATS Tailored Resume</h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Applying for <strong>{previewData.job_title}</strong> at <strong>{previewData.company}</strong>
                </div>
              </div>
              <button onClick={() => setPreviewData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={18} color="var(--text-muted)" />
              </button>
            </div>

            {/* Modal Body: Match score & iframe preview */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: '#F1F5F9', padding: '12px 16px', borderRadius: '8px' }}>
                <div className="badge badge-green" style={{ fontSize: '13px', padding: '6px 12px' }}>
                  🎯 {previewData.match_score}% ATS Job Match
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dark)', flex: 1 }}>
                  <strong>Matched Skills:</strong> {(previewData.matched_skills || []).join(', ') || 'Core Qualifications'}
                </div>
              </div>

              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', height: '420px', background: '#fafafa' }}>
                <iframe
                  src={previewData.tailored_url}
                  title="Tailored Resume Preview"
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#F8FAFC' }}>
              <button className="btn-secondary" onClick={() => setPreviewData(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleConfirmSubmit} disabled={submitting}>
                <Check size={14} /> {submitting ? 'Submitting Application...' : 'Accept & Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: View Job Applicants List Modal */}
      {viewApplicantsJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '750px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  Applicants for {viewApplicantsJob.job.title}
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {viewApplicantsJob.job.company} • {viewApplicantsJob.applicants.length} Total Candidates
                </div>
              </div>
              <button onClick={() => setViewApplicantsJob(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={18} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {applicantsLoading ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading applicants...</div>
              ) : viewApplicantsJob.applicants.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No candidates have applied for this drive yet.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Roll Number</th>
                      <th>Candidate Name</th>
                      <th>Branch</th>
                      <th>ATS Score</th>
                      <th>Applied Date</th>
                      <th>Tailored Resume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewApplicantsJob.applicants.map(app => (
                      <tr key={app.application_id}>
                        <td style={{ fontWeight: 600 }}>{app.student_id}</td>
                        <td>{app.student_name}</td>
                        <td>{app.student_branch || 'CSE'}</td>
                        <td>
                          <span className={`badge ${(app.resume_score || 80) >= 80 ? 'badge-green' : 'badge-amber'}`}>
                            {app.resume_score || 80}/100
                          </span>
                        </td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </td>
                        <td>
                          {app.tailored_resume_path ? (
                            <a
                              href={`/api/resume/tailored/${app.tailored_resume_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-secondary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}
                            >
                              <FileText size={11} /> View Resume
                            </a>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Standard</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
