import React from 'react';
import { GraduationCap, ShieldCheck, User, Sparkles, LogOut } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const isAdmin = user?.role === 'admin';

  return (
    <header style={{
      borderBottom: '1px solid var(--border-color)',
      background: 'rgba(19, 26, 41, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '14px 24px'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366F1 0%, #06B6D4 100%)',
            padding: '10px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
          }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, background: 'linear-gradient(90deg, #F1F5F9 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Smart Campus ERP
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} /> {isAdmin ? 'Admin Portal Control' : 'Student Intelligence Portal'}
            </span>
          </div>
        </div>

        {/* User Session & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: '#0D131F',
            border: '1px solid var(--border-color)',
            padding: '6px 14px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: isAdmin ? 'var(--accent-primary)' : 'var(--accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              {isAdmin ? <ShieldCheck size={16} /> : <User size={16} />}
            </div>

            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {isAdmin ? 'System Administrator' : `Roll: ${user.id} (${user.branch})`}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.85rem', color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
