# ExamStress

Student wellbeing check-ins, anonymous peer support and a counselor early-warning dashboard for schools.

> ExamStress is a screening and support aid. It does not diagnose anything and does not replace professional care or your school's safeguarding procedures.

## What each role can do

| Role | Pages | What they can do |
|---|---|---|
| **Student** | My Wellbeing, Peer Support Chat, My Account | Opt in, do daily check-ins (mood, stress, sleep, optional note and voice recording), see their own trend and tips, chat anonymously with peer mentors, press **I need help now** |
| **Peer mentor** | Peer Support Chat, My Account | Reply to student conversations (students appear under random nicknames), ask a counselor to step in |
| **Counselor** | Counselor Dashboard, Peer Support Chat, School Overview, My Account | See students by pseudonymous ID with zones and trends, receive alerts, reveal a student's identity (with a logged reason), log contacts and notes, escalate and resolve, read and join peer chats, export reports |
| **Administrator** | Counselor Dashboard, School Administration, My Account | Everything counselors see except chats, plus: create accounts or bulk-import them from CSV, reset passwords, deactivate or permanently delete accounts, school settings (zone thresholds, helpline text, alert e-mails, data retention), audit log |

## How scoring works

Each check-in gets a wellbeing score from 0 (needs urgent support) to 100 (doing well):

* It starts from the student's own answers: mood (40%), stress (35%) and sleep (25%).
* Worrying language in the written note (hopelessness, anxiety, overwhelm, low mood, sleep, safety) takes off 6 points per category, up to 24.
* If the student recorded a voice note and has at least 3 earlier voice check-ins, the voice is compared with their **own** usual loudness and pausing. A large change takes off up to 10 points.
* Self-harm or suicide language caps the score at 15. It also immediately raises a **critical** alert, both in check-ins and in peer chat.

Signals can only lower a score, never raise it. Zones (green, yellow, orange, red) come from thresholds the administrator can change. Moving into orange or red raises an alert.

**Privacy:** counselors see a pseudonymous ID (e.g. `S-7KQ2M`) until they reveal the name, and every reveal is audit-logged with a reason. Voice recordings are analysed in memory and never stored. Peer mentors never see who a student is, and phone numbers, e-mails and social handles are stripped from chat messages. Check-ins and closed chats are deleted after the retention period (default 180 days).

## Running locally

Requires Node 20+ and Python 3.11+.

```bash
# 1. Backend
python -m venv .venv
.venv/Scripts/activate            # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r backend/requirements-dev.txt
# First run: creates the first administrator
ADMIN_EMAIL=you@school.edu ADMIN_PASSWORD='ChangeMe123' uvicorn backend.app:app --port 8000
#   (PowerShell: $env:ADMIN_EMAIL='you@school.edu'; $env:ADMIN_PASSWORD='ChangeMe123'; uvicorn backend.app:app --port 8000)

# 2. Frontend (second terminal)
npm install
npm run dev                        # http://localhost:5173 (proxies /api to :8000)
```

Run the tests with `python -m pytest backend/tests -q`.

Sign in as the administrator, then add counselors, peer mentors and students under **School Administration → Users** (one at a time, or **Import CSV** with columns `name,email,grade_class,role`). Every new account gets a temporary password that is shown once and must be changed at first sign-in.

## Deploying

The API also serves the built frontend, so the whole app is **one service on one domain**. The included `Dockerfile` builds both.

1. **Database:** create a PostgreSQL database (Render, Railway, Neon, Supabase and others offer one) and copy its URL. SQLite only works if its file sits on a persistent disk (`sqlite:////data/examstress.db`). Container hosts without a disk wipe it on every deploy.
2. **Deploy the Dockerfile** to any container host (Render "Web Service → Docker", Railway, Fly.io, or `docker build` + `docker run` on a VPS behind HTTPS).
3. **Set environment variables** (see `.env.example`):
   * `ENVIRONMENT=production`
   * `JWT_SECRET`: a long random value. The server refuses to start without one.
   * `DATABASE_URL`
   * `ADMIN_EMAIL` / `ADMIN_PASSWORD` for the first sign-in. Remove `ADMIN_PASSWORD` afterwards.
   * Optional `SMTP_*` so critical alerts are e-mailed to counselors (names are never included).
4. **Serve over HTTPS only** (all of the hosts above do this automatically).
5. Health check path: `/health`.

Lost the only admin password? Run `python -m backend.manage reset-password --email you@school.edu` on the server.

## Before going live: checklist

- [ ] Verify the crisis helpline numbers in **Settings → Help shown to students** are correct for your region.
- [ ] Agree with the school who responds to alerts, how quickly, and outside school hours. ExamStress alerts are not monitored automatically.
- [ ] Configure SMTP so critical alerts reach counselors who are not looking at the dashboard.
- [ ] Get the school's (and where required, parents') approval for collecting student wellbeing data, and point students to the in-app consent notice.
- [ ] Set up automatic database backups with your host.
