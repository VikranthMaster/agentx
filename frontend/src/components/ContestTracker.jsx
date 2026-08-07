import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, RefreshCw, Calendar as CalendarIcon,
  Video, ExternalLink, Plus, Check, Clock, Trophy, X
} from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ContestTracker() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedContest, setSelectedContest] = useState(null);
  const [addedCalId, setAddedCalId] = useState(null);

  // Calendar View State
  const now = new Date();
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const fetchContests = async (forceSync = false) => {
    if (forceSync) setSyncing(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/contests?sync=${forceSync}`);
      const data = await res.json();
      const contestList = data.contests || [];
      setContests(contestList);

      // If we have contests and current month has no contests, auto jump to the month with upcoming contests
      if (contestList.length > 0 && !forceSync) {
        const upcoming = contestList.find(c => new Date(c.start_time) >= new Date());
        if (upcoming) {
          const uDate = new Date(upcoming.start_time);
          setViewDate(new Date(uDate.getFullYear(), uDate.getMonth(), 1));
        }
      }
    } catch (err) {
      console.error('Failed to load contests:', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchContests(false);
  }, []);

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleAddToGCal = async (contest, e) => {
    if (e) e.stopPropagation();
    try {
      setAddedCalId(contest.id);
      const res = await fetch('/api/contests/gcal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contest_name: contest.contest_name,
          start_time: contest.start_time,
          duration: contest.duration || 120,
          platform: contest.platform,
          contest_url: contest.contest_url
        })
      });
      const data = await res.json();
      if (data.link) {
        window.open(data.link, '_blank');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setAddedCalId(null), 3000);
    }
  };

  // Build Calendar Matrix (Weeks x 7 Days)
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Prev month filler days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const prevDay = daysInPrevMonth - i;
    const pDate = new Date(year, month - 1, prevDay);
    calendarDays.push({
      dayNum: prevDay,
      dateObj: pDate,
      isCurrentMonth: false,
      dateStr: pDate.toISOString().split('T')[0]
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const cDate = new Date(year, month, d);
    // Format YYYY-MM-DD using local time
    const yyyy = cDate.getFullYear();
    const mm = String(cDate.getMonth() + 1).padStart(2, '0');
    const dd = String(cDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    calendarDays.push({
      dayNum: d,
      dateObj: cDate,
      isCurrentMonth: true,
      dateStr
    });
  }

  // Next month filler days (fill up to grid of 35 or 42)
  const remainingCells = (calendarDays.length > 35 ? 42 : 35) - calendarDays.length;
  for (let n = 1; n <= remainingCells; n++) {
    const nDate = new Date(year, month + 1, n);
    const yyyy = nDate.getFullYear();
    const mm = String(nDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    calendarDays.push({
      dayNum: n,
      dateObj: nDate,
      isCurrentMonth: false,
      dateStr
    });
  }

  // Group contests by local date YYYY-MM-DD
  const contestsByDate = {};
  contests.forEach(c => {
    if (!c.start_time) return;
    const dt = new Date(c.start_time);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    if (!contestsByDate[key]) contestsByDate[key] = [];
    contestsByDate[key].push(c);
  });

  // Calculate countdown for upcoming contests
  const getCountdownString = (startIso) => {
    const nowTs = new Date().getTime();
    const startTs = new Date(startIso).getTime();
    const diffMins = Math.floor((startTs - nowTs) / (1000 * 60));

    if (diffMins <= 0) return 'Live Now';

    const days = Math.floor(diffMins / (60 * 24));
    const hours = Math.floor((diffMins % (60 * 24)) / 60);
    const mins = diffMins % 60;

    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Filter upcoming contests for sidebar
  const nowTs = new Date().getTime();
  const upcomingContestsList = contests
    .filter(c => new Date(c.end_time || c.start_time).getTime() >= nowTs)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // Check if a cell date is today
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Styling helper for platform pills (matching the screenshot theme)
  const getPillStyle = (platform) => {
    const p = (platform || '').toLowerCase();
    if (p === 'leetcode') {
      return {
        background: 'rgba(245, 158, 11, 0.12)',
        border: '1px solid #F59E0B',
        color: '#D97706',
        icon: '⚡'
      };
    }
    if (p === 'codeforces') {
      return {
        background: '#1E3A8A',
        border: '1px solid #3B82F6',
        color: '#FFFFFF',
        icon: '📊'
      };
    }
    if (p === 'codechef') {
      return {
        background: 'rgba(124, 45, 18, 0.2)',
        border: '1px solid #9A3412',
        color: '#EA580C',
        icon: '📺'
      };
    }
    if (p === 'atcoder') {
      return {
        background: 'rgba(14, 165, 233, 0.15)',
        border: '1px solid #0EA5E9',
        color: '#0284C7',
        icon: '🏆'
      };
    }
    return {
      background: '#1E293B',
      border: '1px solid #475569',
      color: '#E2E8F0',
      icon: '🎯'
    };
  };

  const getPlatformDotColor = (platform) => {
    const p = (platform || '').toLowerCase();
    if (p === 'codeforces') return '#3B82F6';
    if (p === 'leetcode') return '#F59E0B';
    if (p === 'codechef') return '#EA580C';
    if (p === 'atcoder') return '#0EA5E9';
    return '#8B5CF6';
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
      {/* ── Left Calendar Section ───────────────────────────────────────────── */}
      <div className="card" style={{ padding: '0', overflow: 'hidden', background: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC' }}>
        {/* Calendar Header */}
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1E293B',
          background: '#0B132B'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              {MONTH_NAMES[month]} {year}
            </h2>
            <button
              onClick={handleToday}
              style={{
                background: '#1E293B',
                border: '1px solid #334155',
                color: '#94A3B8',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Today
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => fetchContests(true)}
              disabled={syncing}
              style={{
                background: '#1E293B',
                border: '1px solid #334155',
                color: '#38BDF8',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={13} className={syncing ? 'spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync'}
            </button>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={handlePrevMonth}
                style={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  color: '#94A3B8',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNextMonth}
                style={{
                  background: '#1E293B',
                  border: '1px solid #334155',
                  color: '#94A3B8',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Days of Week Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          background: '#0F172A',
          borderBottom: '1px solid #1E293B',
          textAlign: 'center'
        }}>
          {DAYS_OF_WEEK.map(day => (
            <div key={day} style={{ padding: '10px 0', fontSize: '12px', fontWeight: 600, color: '#64748B' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          background: '#1E293B',
          gap: '1px' // Creates crisp borders
        }}>
          {calendarDays.map((cell, idx) => {
            const dayContests = contestsByDate[cell.dateStr] || [];
            const isToday = cell.dateStr === todayStr;

            return (
              <div
                key={idx}
                style={{
                  background: isToday ? '#152E4D' : (cell.isCurrentMonth ? '#0B132B' : '#070C1A'),
                  minHeight: '110px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  position: 'relative'
                }}
              >
                {/* Date Number */}
                <div style={{
                  fontSize: '12px',
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? '#38BDF8' : (cell.isCurrentMonth ? '#94A3B8' : '#334155'),
                  marginBottom: '2px'
                }}>
                  {cell.dayNum}
                </div>

                {/* Event Pills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '84px' }}>
                  {dayContests.map(c => {
                    const pillStyle = getPillStyle(c.platform);
                    return (
                      <div
                        key={c.id || c.external_id}
                        onClick={() => setSelectedContest(c)}
                        title={`${c.contest_name} (${c.platform})`}
                        style={{
                          background: pillStyle.background,
                          border: pillStyle.border,
                          color: pillStyle.color,
                          borderRadius: '4px',
                          padding: '3px 6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span style={{ fontSize: '10px' }}>{pillStyle.icon}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.contest_name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Sidebar Section ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Upcoming Contests List Box */}
        <div className="card" style={{ background: '#0F172A', border: '1px solid #1E293B', color: '#F8FAFC', padding: '16px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={16} color="#38BDF8" /> Upcoming Contests
          </h3>

          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
              Loading schedule...
            </div>
          ) : upcomingContestsList.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '12px' }}>
              No upcoming contests.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
              {upcomingContestsList.slice(0, 7).map(c => {
                const dt = new Date(c.start_time);
                const monthShort = SHORT_MONTHS[dt.getMonth()];
                const dayNum = dt.getDate();
                const dotColor = getPlatformDotColor(c.platform);
                const countdown = getCountdownString(c.start_time);

                return (
                  <div
                    key={c.id || c.external_id}
                    onClick={() => setSelectedContest(c)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: '#1E293B',
                      border: '1px solid #334155',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s'
                    }}
                  >
                    {/* Date Badge */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#0F172A',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      minWidth: '40px',
                      border: '1px solid #334155'
                    }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#94A3B8' }}>{monthShort}</span>
                      <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF', lineHeight: 1 }}>{dayNum}</span>
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#F1F5F9',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {c.contest_name}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                        <span style={{ textTransform: 'capitalize' }}>{c.platform}</span>
                        <span>•</span>
                        <span style={{ color: '#38BDF8', fontWeight: 500 }}>{countdown}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Feature / Banner Promo Card */}
        <div style={{
          background: 'linear-gradient(135deg, #0284C7 0%, #06B6D4 50%, #3B82F6 100%)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 20px rgba(14, 165, 233, 0.25)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.9 }}>
            SMART CAMPUS DRIVE
          </div>
          <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '6px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>
            EXPLORE PLACEMENT COURSES & CONTEST PREP
          </div>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            <span>View All Drives</span>
            <ChevronRight size={16} />
          </div>
        </div>
      </div>

      {/* ── Contest Detail Modal ────────────────────────────────────────────── */}
      {selectedContest && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#0F172A',
            border: '1px solid #334155',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            color: 'white',
            position: 'relative',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
          }}>
            <button
              onClick={() => setSelectedContest(null)}
              style={{
                position: 'absolute', right: '16px', top: '16px',
                background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span className="badge badge-blue" style={{ textTransform: 'capitalize', fontWeight: 700 }}>
                {selectedContest.platform}
              </span>
              <span style={{ fontSize: '12px', color: '#94A3B8' }}>ID: {selectedContest.external_id || selectedContest.id}</span>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'white', marginBottom: '16px', lineHeight: 1.4 }}>
              {selectedContest.contest_name}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: '#CBD5E1', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={15} color="#38BDF8" />
                <span>Start: {new Date(selectedContest.start_time).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={15} color="#38BDF8" />
                <span>Duration: {selectedContest.duration ? `${selectedContest.duration} minutes` : 'N/A'}</span>
              </div>
              {selectedContest.has_solution_video && selectedContest.solution_video_url && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Video size={15} color="#EF4444" />
                  <a href={selectedContest.solution_video_url} target="_blank" rel="noreferrer" style={{ color: '#F87171', textDecoration: 'underline' }}>
                    Watch Solution Video
                  </a>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <a
                href={selectedContest.contest_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary btn-sm"
                style={{ textDecoration: 'none', padding: '8px 14px' }}
              >
                Join Contest <ExternalLink size={13} />
              </a>

              <button
                className="btn-secondary btn-sm"
                onClick={(e) => handleAddToGCal(selectedContest, e)}
                style={{ padding: '8px 14px' }}
              >
                {addedCalId === selectedContest.id ? <Check size={13} /> : <Plus size={13} />}
                {addedCalId === selectedContest.id ? 'Added!' : 'Add to Google Cal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
