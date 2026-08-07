import React, { useState } from 'react';
import {
  Mail, UserPlus, UserMinus, Send, CheckCircle2,
  AlertCircle, RefreshCw, Bell, Rss
} from 'lucide-react';

export default function NewsletterManager({ role, studentId, studentEmail }) {
  const isAdmin = role === 'admin';

  const [email, setEmail] = useState(studentEmail || '');
  const [subscribeStatus, setSubscribeStatus] = useState(null);
  const [sendResult, setSendResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [unsubscribing, setUnsubscribing] = useState(false);

  const PREVIEW_ITEMS = [
    { tag: 'AI / LLMs', title: 'Gemini 2.5 Pro Beats GPT-4o on Coding Benchmarks', color: '#6366f1' },
    { tag: 'Open Source', title: "Meta Releases LLaMA 3.3 70B — Matches 405B at a Fraction of the Cost", color: '#0ea5e9' },
    { tag: 'Multi-Agent', title: 'Agent2Agent (A2A) Protocol — Google\'s Open Standard', color: '#10b981' },
    { tag: 'Systems', title: 'Rust Overtakes Java in GitHub Trending for the Third Month Running', color: '#f59e0b' },
    { tag: 'Vector DBs', title: 'ChromaDB 0.6 Ships Native Multi-Tenant Embeddings with Streaming', color: '#ef4444' },
  ];

  const handleSubscribe = async () => {
    if (!email.trim()) return;
    setSubscribing(true);
    setSubscribeStatus(null);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), student_id: studentId || null })
      });
      const data = await res.json();
      setSubscribeStatus({ type: data.status === 'success' ? 'success' : 'error', text: data.message });
    } catch (err) {
      setSubscribeStatus({ type: 'error', text: 'Network error. Try again.' });
    } finally {
      setSubscribing(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (!email.trim()) return;
    setUnsubscribing(true);
    setSubscribeStatus(null);
    try {
      const res = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      });
      const data = await res.json();
      setSubscribeStatus({ type: data.status === 'success' ? 'success' : 'error', text: data.message });
    } catch {
      setSubscribeStatus({ type: 'error', text: 'Network error. Try again.' });
    } finally {
      setUnsubscribing(false);
    }
  };

  const handleSendNow = async () => {
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/newsletter/send-now?force=true', { method: 'POST' });
      const data = await res.json();
      setSendResult(data);
    } catch {
      setSendResult({ status: 'error', message: 'Network error.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#6366f1 0%,#0ea5e9 100%)',
        borderRadius: 16, padding: '32px 36px', marginBottom: 28, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 44, height: 44, background: 'rgba(255,255,255,0.2)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Rss size={22} color="#fff" />
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Campus Tech Newsletter</h2>
          </div>
          <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>
            Weekly digest of what's moving the industry — delivered to your inbox.
          </p>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '12px 20px',
          textAlign: 'center', backdropFilter: 'blur(8px)'
        }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>5</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>stories/week</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Subscribe Card */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 36, height: 36, background: 'var(--purple-light)',
              borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Bell size={18} color="var(--purple)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-dark)' }}>
                Manage Subscription
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Subscribe or unsubscribe your email</p>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
              EMAIL ADDRESS
            </label>
            <input
              id="newsletter-email-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--border-input)', fontSize: 14,
                outline: 'none', background: '#fff', color: 'var(--text-dark)'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              id="newsletter-subscribe-btn"
              className="btn-primary"
              onClick={handleSubscribe}
              disabled={subscribing || !email.trim()}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {subscribing ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={14} />}
              {subscribing ? 'Subscribing...' : 'Subscribe'}
            </button>
            <button
              id="newsletter-unsubscribe-btn"
              onClick={handleUnsubscribe}
              disabled={unsubscribing || !email.trim()}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)',
                background: '#fff', color: 'var(--text-body)', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              {unsubscribing ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserMinus size={14} />}
              {unsubscribing ? 'Unsubscribing...' : 'Unsubscribe'}
            </button>
          </div>

          {subscribeStatus && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: subscribeStatus.type === 'success' ? 'var(--green-light)' : 'var(--red-light)',
              color: subscribeStatus.type === 'success' ? '#065f46' : '#991b1b',
              display: 'flex', alignItems: 'center', gap: 8
            }}>
              {subscribeStatus.type === 'success'
                ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {subscribeStatus.text}
            </div>
          )}
        </div>

        {/* Admin Send Card */}
        {isAdmin ? (
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 36, height: 36, background: 'var(--blue-light)',
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Send size={18} color="var(--blue)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-dark)' }}>Admin Send</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Force-send to all active subscribers</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              Sends the current newsletter to all active subscribers immediately,
              bypassing the daily-send guard.
            </p>

            <button
              id="newsletter-send-now-btn"
              className="btn-primary"
              onClick={handleSendNow}
              disabled={sending}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {sending ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
              {sending ? 'Sending...' : 'Send Newsletter Now'}
            </button>

            {sendResult && (
              <div style={{
                marginTop: 14, padding: '12px 16px', borderRadius: 8, fontSize: 13,
                background: sendResult.status === 'success' ? 'var(--green-light)'
                  : sendResult.status === 'skipped' ? 'var(--amber-light)' : 'var(--red-light)',
                color: sendResult.status === 'success' ? '#065f46'
                  : sendResult.status === 'skipped' ? '#92400e' : '#991b1b',
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {sendResult.status === 'success' ? `✅ Sent to ${sendResult.sent} subscriber(s)`
                    : sendResult.status === 'skipped' ? `⏭ Skipped: ${sendResult.reason}`
                    : `❌ Error: ${sendResult.message}`}
                </div>
                {sendResult.failed?.length > 0 && (
                  <div style={{ fontSize: 12 }}>Failed: {sendResult.failed.map(f => f.email).join(', ')}</div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{
                width: 36, height: 36, background: 'var(--amber-light)',
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Mail size={18} color="var(--amber)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-dark)' }}>This Week's Topics</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Subscribe to get these delivered</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PREVIEW_ITEMS.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    display: 'inline-block', background: item.color + '20', color: item.color,
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    whiteSpace: 'nowrap', flexShrink: 0
                  }}>{item.tag}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.4 }}>{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Email Preview */}
      <div className="card" style={{ marginTop: 24, padding: 28 }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: 'var(--text-dark)' }}>
          📧 Newsletter Preview
        </h3>
        <div style={{
          background: '#0f172a', borderRadius: 14, padding: 28,
          fontFamily: "'Segoe UI', Arial, sans-serif"
        }}>
          <div style={{
            background: 'linear-gradient(135deg,#6366f1,#0ea5e9)', borderRadius: 12,
            padding: '24px 28px', textAlign: 'center', marginBottom: 24
          }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: 'rgba(255,255,255,0.7)', letterSpacing: 3, textTransform: 'uppercase', fontWeight: 700 }}>
              Smart Campus ERP
            </p>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff' }}>🚀 This Week in Tech</h2>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
              Your weekly digest of what's moving the industry
            </p>
          </div>
          {PREVIEW_ITEMS.map((item, i) => (
            <div key={i} style={{
              background: '#1e293b', borderRadius: 12, padding: '20px 24px', marginBottom: 16
            }}>
              <span style={{
                display: 'inline-block', background: item.color, color: '#fff',
                fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8
              }}>{item.tag}</span>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>{item.title}</div>
              <div style={{
                display: 'inline-block', background: item.color, color: '#fff',
                fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 6, marginTop: 6
              }}>Read More →</div>
            </div>
          ))}
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <p style={{ fontSize: 12, color: '#64748b' }}>
              © 2026 Smart Campus ERP · Built with ❤️ using LangGraph &amp; Groq
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
