"""
Newsletter service — Zoho SMTP over STARTTLS (port 587).
send_newsletter() is designed to be called in a background thread so it
never blocks FastAPI startup or request handling.
Sends on every server startup — no "once per day" guard.
"""
import os
import smtplib
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.data.newsletter_content import NEWSLETTER_ITEMS, NEWSLETTER_SUBJECT
from app.database import (
    get_active_subscribers,
    log_newsletter_sent,
)

# SMTP defaults — actual values read fresh inside _send_sync at call time
# so dotenv is guaranteed to have loaded before we use them.
_SMTP_HOST_DEFAULT = "smtp.zoho.in"
_SMTP_PORT_DEFAULT = 587
FROM_NAME = "Smart Campus"


# ── HTML renderer ──────────────────────────────────────────────────────────────

def render_html() -> str:
    """Build a beautiful, responsive HTML email body from NEWSLETTER_ITEMS."""

    items_html = ""
    for i, item in enumerate(NEWSLETTER_ITEMS):
        tag_color = [
            "#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"
        ][i % 5]
        items_html += f"""
        <tr>
          <td style="padding:0 0 28px 0;">
            <table cellpadding="0" cellspacing="0" width="100%"
                   style="background:#1e293b;border-radius:12px;overflow:hidden;">
              <tr>
                <td style="padding:24px 28px;">
                  <span style="display:inline-block;background:{tag_color};color:#fff;
                               font-size:11px;font-weight:700;letter-spacing:1px;
                               padding:3px 10px;border-radius:20px;text-transform:uppercase;
                               margin-bottom:10px;">{item.get('tag','Tech')}</span>
                  <h3 style="margin:0 0 8px 0;font-size:17px;font-weight:700;
                             color:#f1f5f9;line-height:1.4;">{item['title']}</h3>
                  <p style="margin:0 0 14px 0;font-size:14px;color:#94a3b8;
                            line-height:1.6;">{item['summary']}</p>
                  <a href="{item['link']}"
                     style="display:inline-block;background:{tag_color};color:#fff;
                            font-size:13px;font-weight:600;padding:8px 18px;
                            border-radius:6px;text-decoration:none;">Read More →</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>{NEWSLETTER_SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table cellpadding="0" cellspacing="0" width="100%"
         style="background:#0f172a;padding:40px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" width="600"
               style="max-width:600px;width:100%;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#0ea5e9 100%);
                       border-radius:16px 16px 0 0;padding:36px 40px;text-align:center;">
              <p style="margin:0 0 4px 0;font-size:12px;color:rgba(255,255,255,0.75);
                        letter-spacing:3px;text-transform:uppercase;font-weight:600;">
                Smart Campus ERP
              </p>
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;line-height:1.3;">
                🚀 This Week in Tech
              </h1>
              <p style="margin:8px 0 0 0;font-size:14px;color:rgba(255,255,255,0.8);">
                Your weekly digest of what's moving the industry
              </p>
            </td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="background:#0f172a;padding:32px 24px 8px 24px;">
              <table cellpadding="0" cellspacing="0" width="100%">
                {items_html}
              </table>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:#1e293b;border-radius:0 0 16px 16px;
                       padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;color:#64748b;">
                You're receiving this because you subscribed to Smart Campus Weekly.
              </p>
              <p style="margin:0;font-size:12px;color:#475569;">
                © 2026 Smart Campus ERP · Built with ❤️ using LangGraph &amp; Groq
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""


# ── Core send logic ────────────────────────────────────────────────────────────

def _send_sync(force: bool = False) -> dict:
    """
    Synchronous send function — runs inside a daemon thread so it never
    blocks startup. Uses SMTP + STARTTLS (port 587).
    Always sends on every call — no once-per-day guard.
    Reads SMTP credentials fresh from env at call-time (not import-time)
    so they are always available after dotenv loads.
    """
    curr_dir = os.path.dirname(os.path.abspath(__file__))
    app_dir = os.path.dirname(curr_dir)
    backend_dir = os.path.dirname(app_dir)
    root_dir = os.path.dirname(backend_dir)

    from dotenv import load_dotenv
    for env_file in [
        os.path.join(backend_dir, ".env"),
        os.path.join(root_dir, ".env"),
    ]:
        if os.path.exists(env_file):
            load_dotenv(env_file, override=True)

    # ── Read SMTP config with robust defaults ──────────────────────────
    smtp_host = os.getenv("SMTP_HOST") or "smtp.zoho.in"
    smtp_port = int(os.getenv("SMTP_PORT") or "587")
    smtp_user = os.getenv("SMTP_USER") or "valyrianminds@zohomail.in"
    smtp_pass = os.getenv("SMTP_PASSWORD") or "yGy6ikpmsewd"
    from_email = os.getenv("SMTP_FROM_EMAIL") or smtp_user

    print(f"[Newsletter] SMTP config — host={smtp_host} port={smtp_port} user={smtp_user}")

    subscribers = get_active_subscribers()
    if not subscribers:
        print("[Newsletter] No active subscribers, skipping.")
        return {"status": "skipped", "reason": "no subscribers"}

    if not smtp_user or not smtp_pass:
        print("[Newsletter] SMTP credentials missing in .env, skipping.")
        return {"status": "skipped", "reason": "SMTP credentials not configured in .env"}

    html = render_html()
    sent, failed = 0, []

    try:
        # Port 587 = STARTTLS — plain SMTP then upgrade to TLS
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_user, smtp_pass)
        print(f"[Newsletter] SMTP connected to {smtp_host}:{smtp_port} via STARTTLS")
    except Exception as e:
        print(f"[Newsletter] SMTP login failed: {e}")
        return {"status": "error", "message": f"SMTP login failed: {e}"}

    for email in subscribers:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = NEWSLETTER_SUBJECT
            msg["From"] = f"{FROM_NAME} <{from_email}>"
            msg["To"] = email
            msg.attach(MIMEText(html, "html"))
            server.sendmail(from_email, email, msg.as_string())
            sent += 1
        except Exception as e:
            failed.append({"email": email, "error": str(e)})

    try:
        server.quit()
    except Exception:
        pass

    log_newsletter_sent(sent)
    print(f"[Newsletter] Sent to {sent} subscriber(s). Failed: {len(failed)}")
    return {"status": "success", "sent": sent, "failed": failed}


def send_newsletter(force: bool = False) -> None:
    """
    Fire-and-forget: spawns a daemon thread so the caller (FastAPI startup /
    route handler) returns immediately without waiting for SMTP round-trips.
    """
    t = threading.Thread(target=_send_sync, args=(force,), daemon=True)
    t.start()


def send_newsletter_sync(force: bool = False) -> dict:
    """Blocking version — used by the /send-now admin route so it can return the result."""
    return _send_sync(force=force)
