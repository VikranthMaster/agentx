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
  UserPlus, LogOut, GraduationCap, LayoutDashboard, ChevronRight, Trophy, Download, FileText
} from 'lucide-react';

// ── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ user, activeTab, onTabChange, onLogout }) {
  const isAdmin = user?.role === 'admin';
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const adminNav = [
    { id: 'admin_chat',       label: 'AI Assistant',         icon: Bot },
    { id: 'post_attendance',  label: 'Post Attendance',       icon: UserCheck },
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

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">SC</div>
        <div>
          <div className="sidebar-brand-text">Smart Campus</div>
          <div className="sidebar-brand-sub">ERP System</div>
        </div>
      </div>

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
  }, [user, activeTab]);

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
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    if (user) {
      localStorage.setItem('smart_campus_user', JSON.stringify(user));
      setActiveTab(user.role === 'admin' ? 'admin_chat' : 'chat');
    } else {
      localStorage.removeItem('smart_campus_user');
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('smart_campus_user');
  };

  if (!user) return <Login onLoginSuccess={setUser} />;

  const isAdmin = user.role === 'admin';

  return (
    <div className="app-layout">
      <Sidebar user={user} activeTab={activeTab} onTabChange={setActiveTab} onLogout={handleLogout} />

      <div className="page-content">
        <PageHeader user={user} activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="page-main">
          {!isAdmin && (
            <>
              {activeTab === 'chat'           && <StudentChatbot user={user} />}
              {activeTab === 'attendance'     && <StudentAttendance studentId={user.id} />}
              {activeTab === 'contests'       && <ContestTracker />}
              {activeTab === 'jobs'           && <JobsBoard role="student" studentId={user.id} />}
              {activeTab === 'syllabus'       && <SyllabusManager role="student" />}
              {activeTab === 'resume_profile' && <ResumeUploader studentId={user.id} />}
            </>
          )}
          {isAdmin && (
            <>
              {activeTab === 'admin_chat'      && <AdminChatbot user={user} />}
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

