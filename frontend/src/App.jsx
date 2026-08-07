import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import StudentAttendance from './components/StudentAttendance';
import AdminAttendancePoster from './components/AdminAttendancePoster';
import AdminChatbot from './components/AdminChatbot';
import StudentChatbot from './components/StudentChatbot';
import JobsBoard from './components/JobsBoard';
import AdminApplications from './components/AdminApplications';
import AdminStudentManager from './components/AdminStudentManager';
import SyllabusManager from './components/SyllabusManager';
import ContestTracker from './components/ContestTracker';
import ResumeUploader from './components/ResumeUploader';
import {
  Calendar, UserCheck, Bot, Briefcase, Users, BookOpen,
  UserPlus, LogOut, GraduationCap, ChevronRight, Trophy, Download, FileText, Award,
  Plus, MessageSquare, ChevronDown, FileSearch
} from 'lucide-react';
import AdminExamAssessor from './components/AdminExamAssessor';

// ── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ user, activeTab, onTabChange, onLogout, currentSession, setCurrentSession }) {
  const isAdmin = user?.role === 'admin';
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const [pastChats, setPastChats] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);

  const adminNav = [
    { id: 'admin_chat',       label: 'AI Assistant',         icon: Bot },
    { id: 'post_attendance',  label: 'Post Attendance',       icon: UserCheck },
    { id: 'exam_assessor',    label: 'Grade Exams (OCR)',     icon: FileSearch }, // <-- ADD THIS
    { id: 'students',         label: 'Register Student',      icon: UserPlus },
    { id: 'applications',     label: 'Applications (ATS)',    icon: Users },
    { id: 'post_job',         label: 'Placement Drives',      icon: Briefcase },
    { id: 'syllabus_admin',   label: 'Upload Syllabus',       icon: BookOpen },
    { id: 'contests',         label: 'Contest Tracker',       icon: Trophy },
  ];

  const studentNav = [
    { id: 'chat',           label: 'AI Assistant',     icon: Bot },
    { id: 'attendance',     label: 'My Attendance',    icon: Calendar },
    { id: 'contests',       label: 'Contest Tracker',  icon: Trophy },
    { id: 'jobs',           label: 'Job Drives',       icon: Briefcase },
    { id: 'syllabus',       label: 'Syllabus',         icon: BookOpen },
    { id: 'resume_profile', label: 'Resume Profile',   icon: FileText },
  ];

  const navItems = isAdmin ? adminNav : studentNav;

  // Fetch chat history for the sidebar
  useEffect(() => {
    if (!user?.id) return;
    
    fetch(`/api/chat-logs/${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.logs && data.logs.length > 0) {
          const sessions = {};
          data.logs.forEach(log => {
            const sId = log.session_id || 'default';
            if (!sessions[sId]) sessions[sId] = [];
            sessions[sId].push(log);
          });

          const history = Object.keys(sessions).map(sId => {
            const userMsgs = sessions[sId].filter(m => m.role === 'user');
            const title = userMsgs.length > 0 ? userMsgs[0].content : 'New Conversation';
            return {
              id: sId,
              title: title.length > 30 ? title.substring(0, 30) + '...' : title
            };
          }).reverse(); 
          
          setPastChats(history);
        }
      })
      .catch(err => console.error("Failed to load chat history:", err));
  }, [user, currentSession, activeTab]);

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">SC</div>
        <div>
          <div className="sidebar-brand-text">Smart Campus</div>
          <div className="sidebar-brand-sub">ERP System</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Nav */}
        <div className="sidebar-section">{isAdmin ? 'Administration' : 'Student Portal'}</div>
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`sidebar-item ${activeTab === id ? 'active' : ''}`}
            onClick={() => onTabChange(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}

        {/* --- Chat History Section --- */}
        <div style={{ padding: '0 12px', marginTop: '24px' }}>
          <button
            onClick={() => {
              onTabChange(isAdmin ? 'admin_chat' : 'chat');
              setCurrentSession(Date.now().toString());
            }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 12px', background: 'var(--blue-light)',
              border: '1px solid var(--blue-dark)', borderRadius: '8px', color: 'var(--blue-dark)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px'
            }}
          >
            <Plus size={16} /> New Chat
          </button>

          <div
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', fontSize: '11px', fontWeight: 700,
              color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px',
              marginBottom: '8px', padding: '0 4px'
            }}
          >
            Previous Convos
            {isHistoryOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>

          {isHistoryOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {pastChats.map(chat => (
                <button
                  key={chat.id}
                  onClick={() => {
                    onTabChange(isAdmin ? 'admin_chat' : 'chat');
                    setCurrentSession(chat.id);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px',
                    background: currentSession === chat.id && (activeTab === 'chat' || activeTab === 'admin_chat') ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none', borderRadius: '6px',
                    color: currentSession === chat.id && (activeTab === 'chat' || activeTab === 'admin_chat') ? '#fff' : 'var(--text-muted)',
                    fontSize: '13px', textAlign: 'left', cursor: 'pointer',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                  }}
                  onMouseOver={e => e.currentTarget.style.color = '#fff'}
                  onMouseOut={e => {
                     if (!(currentSession === chat.id && (activeTab === 'chat' || activeTab === 'admin_chat'))) {
                       e.currentTarget.style.color = 'var(--text-muted)';
                     }
                  }}
                >
                  <MessageSquare size={14} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || user?.id}
            </div>
            <div className="sidebar-user-role">{isAdmin ? 'Administrator' : user?.id}</div>
          </div>
          <button onClick={onLogout} title="Logout" style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Page Header ──────────────────────────────────────────────────────────────
const TAB_LABELS = {
  admin_chat:      'AI Assistant',
  post_attendance: 'Post Attendance',
  students:        'Register Student',
  applications:    'Applications (ATS)',
  post_job:        'Placement Drives',
  syllabus_admin:  'Upload Syllabus',
  chat:            'AI Assistant',
  attendance:      'My Attendance',
  contests:        'Contest Tracker',
  jobs:            'Job Drives',
  syllabus:        'Syllabus',
  resume_profile:  'Resume Profile',
};

function PageHeader({ user, activeTab, onTabChange }) {
  const isAdmin = user?.role === 'admin';
  const [shortlistedApps, setShortlistedApps] = useState([]);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (!isAdmin && user?.id) {
      fetch(`/api/jobs/my-applications/${encodeURIComponent(user.id)}`)
        .then(res => res.json())
        .then(data => {
          const shortlisted = (data.applications || []).filter(a => a.status === 'SHORTLISTED');
          setShortlistedApps(shortlisted);
        })
        .catch(err => console.error(err));
    }
  }, [user?.id, isAdmin]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setDeferredPrompt(null);
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <header className="page-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
        <GraduationCap size={14} />
        <span>{isAdmin ? 'Admin Portal' : 'Student Portal'}</span>
        <ChevronRight size={12} />
        <span style={{ color: 'var(--text-dark)', fontWeight: 600 }}>{TAB_LABELS[activeTab] || activeTab}</span>
      </div>

      {!isAdmin && shortlistedApps.length > 0 && (
        <div
          onClick={() => onTabChange('jobs')}
          style={{
            marginLeft: '20px',
            background: '#DCFCE7',
            border: '1px solid #86EFAC',
            color: '#15803D',
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(22, 163, 74, 0.1)'
          }}
          title="Click to view your shortlisted application"
        >
          <Award size={14} color="#16A34A" />
          <span>🎉 Congratulations! You are SHORTLISTED for {shortlistedApps[0]?.job_title || shortlistedApps[0]?.title || 'a Placement Drive'} @ {shortlistedApps[0]?.company || 'Company'}!</span>
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {deferredPrompt && !installed && (
          <button
            onClick={handleInstallPWA}
            className="btn-primary btn-sm"
            style={{ borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <Download size={13} /> Install App
          </button>
        )}
      </div>
    </header>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_campus_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_campus_user');
      const u = saved ? JSON.parse(saved) : null;
      return u ? (u.role === 'admin' ? 'admin_chat' : 'chat') : '';
    } catch {
      return '';
    }
  });

  // Track the current chat session universally
  const [currentSession, setCurrentSession] = useState(() => {
      return localStorage.getItem('active_chat_session') || Date.now().toString();
    });
  useEffect(() => {
    if (user) {
      localStorage.setItem('smart_campus_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('smart_campus_user');
    }
  }, [user?.id, user?.role]);
  useEffect(() => {
    localStorage.setItem('active_chat_session', currentSession);
  }, [currentSession]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('smart_campus_user');
  };

  if (!user) return <Login onLoginSuccess={setUser} />;

  const isAdmin = user.role === 'admin';

  return (
    <div className="app-layout">
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onLogout={handleLogout} 
        currentSession={currentSession}
        setCurrentSession={setCurrentSession}
      />

      <div className="page-content">
        <PageHeader user={user} activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="page-main">
          {!isAdmin && (
            <>

              {activeTab === 'chat'           && <StudentChatbot user={user} currentSession={currentSession} />}
              {activeTab === 'attendance'     && <StudentAttendance studentId={user.id} />}
              {activeTab === 'contests'       && <ContestTracker />}
              {activeTab === 'jobs'           && <JobsBoard role="student" studentId={user.id} />}
              {activeTab === 'syllabus'       && <SyllabusManager role="student" />}
              {activeTab === 'resume_profile' && <ResumeUploader studentId={user.id} />}
            </>
          )}
          {isAdmin && (
            <>
              {activeTab === 'admin_chat'      && <AdminChatbot user={user} currentSession={currentSession} />}
              {activeTab === 'exam_assessor'   && <AdminExamAssessor />} {/* <-- ADD THIS */}
              {activeTab === 'post_attendance' && <AdminAttendancePoster user={user} />}
              {activeTab === 'students'        && <AdminStudentManager />}
              {activeTab === 'applications'    && <AdminApplications />}
              {activeTab === 'post_job'        && <JobsBoard role="admin" studentId={user.id} />}
              {activeTab === 'syllabus_admin'  && <SyllabusManager role="admin" />}
              {activeTab === 'contests'        && <ContestTracker />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}