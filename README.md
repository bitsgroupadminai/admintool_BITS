# BITS Edu Admin Platform

**Smart Workflow-Based Queue and Administrative Service Management System for Educational Institutions**

A workflow-first campus admin platform. Institutes configure services (admissions, certificates, counselling, etc.), students apply with guidance, and staff/AI process requests step by step — with queue and appointment support for visits.

---

## Who this README is for

- New juniors joining the project  
- Evaluators who need to run a local demo  
- Anyone cloning the GitHub repo for the first time  

**Read order for juniors**

1. This README (overview + quick start)  
2. [`docs/INSTALLATION.md`](docs/INSTALLATION.md) (detailed setup)  
3. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (how code is organized)  
4. [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md) (how to use Admin / Staff / Student)  
5. [`APP_TEST_GUIDE.txt`](APP_TEST_GUIDE.txt) (full end-to-end test script)

---

## What you get (3 apps)

| App | Folder | Local URL | Purpose |
| --- | --- | --- | --- |
| Backend API | `backend/` | http://localhost:5001 | Auth, services, offerings, applications, AI, queue, chat |
| Admin & Staff portal | `frontend-admin/` | http://localhost:5173 | Setup, configure services, review, operations |
| Student portal | `frontend-student/` | http://localhost:5174 | Enroll, apply, track status, queue/appointments, chat |

Databases (via Docker):

- **MongoDB** → stores institute/service/application data  
- **Redis** → sessions, BullMQ workers, cache  

Health check: http://localhost:5001/api/v1/health

---

## Prerequisites

- Node.js **20+**
- npm
- Docker Desktop
- Git
- Chrome / Edge

---

## Quick start (copy-paste)

```bash
# 1) Clone
git clone https://github.com/bitsgroupadminai/admintool_BITS.git
cd admintool_BITS

# 2) Start MongoDB + Redis
docker compose up -d

# 3) Backend
cd backend
copy .env.example .env
# then edit .env → set SESSION_SECRET at minimum
npm install
npm run dev
```

New terminal:

```bash
cd frontend-admin
npm install
npm run dev
```

New terminal:

```bash
cd frontend-student
npm install
npm run dev
```

Open:

1. Admin signup → http://localhost:5173/signup  
2. Student portal → http://localhost:5174  

macOS/Linux: use `cp .env.example .env` instead of `copy`.

---

## Minimum `.env` values

File: `backend/.env` (created from `.env.example`)

```env
MONGODB_URI=mongodb://127.0.0.1:27017/admintool
REDIS_URL=redis://127.0.0.1:6379
SESSION_SECRET=change-me-to-a-long-random-string
ADMIN_CLIENT_URL=http://localhost:5173
STUDENT_CLIENT_URL=http://localhost:5174
```

### Optional (enable richer features)

| Feature | Env vars |
| --- | --- |
| AI extraction / verification / chat | `OPENAI_API_KEY` |
| Stronger chatbot (RAG) | `PINECONE_API_KEY`, `PINECONE_INDEX` |
| Email notifications | `RESEND_API_KEY`, `EMAIL_FROM` (SMTP `SMTP_*` is backup) |
| Payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| Google Meet appointments | `GOOGLE_OAUTH_*` |
| Turn on AI verification worker | `AI_VERIFICATION_ENABLED=true` |

Without optional keys, the core workflow still runs. AI/email/payment features are limited or skipped.

**Never commit `backend/.env`.** Only placeholders belong in `.env.example`.

---

## First demo path (10 minutes)

1. Admin signup → create institute  
2. Setup wizard: institute → add staff → finish  
3. **Services** → create service → upload a knowledge PDF/DOCX  
4. Create offering → complete wizard → **Activate**  
5. Student portal → apply + upload docs  
6. Staff login → approve / return request  
7. Optional: student joins queue or books appointment  

Details: [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md)

---

## Project structure (simple)

```text
backend/                 Express API + workers (feature modules)
frontend-admin/          Admin + Staff React app
frontend-student/        Student React app
docs/                    Installation, User Manual, Architecture
docker-compose.yml       MongoDB + Redis
APP_TEST_GUIDE.txt       Manual E2E testing script
README.md                You are here
```

How modules connect: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Common commands

| Task | Command |
| --- | --- |
| Start DB | `docker compose up -d` |
| Stop DB | `docker compose down` |
| Backend dev | `cd backend && npm run dev` |
| Admin UI | `cd frontend-admin && npm run dev` |
| Student UI | `cd frontend-student && npm run dev` |
| Backend unit tests | `cd backend && npm test` |

---

## Roles in one sentence each

- **Admin** configures institute, services, offerings, students, and monitors operations  
- **Staff** reviews applications, handles AI escalations, runs queue/appointments  
- **Student** applies, uploads documents, tracks status, chats, joins queue/books slot  

---

## Troubleshooting

| Symptom | Likely fix |
| --- | --- |
| Backend fails at start | Run `docker compose up -d` (Mongo/Redis required) |
| Login cookie / CORS errors | Match `ADMIN_CLIENT_URL` / `STUDENT_CLIENT_URL` to real UI URLs |
| Port already used | Free ports 5001 / 5173 / 5174 |
| AI features do nothing | Add `OPENAI_API_KEY` or keep using manual staff flow |
| Offering not visible to students | Offering must be **Activated** |
| `npm install` errors | Use Node 20+ |

More help: [`docs/INSTALLATION.md`](docs/INSTALLATION.md)

---

## Security notes

- Real secrets stay only in local `backend/.env` (gitignored)  
- `backend/.env.example` must contain **placeholders only**  
- Do not commit Google service-account JSON (`study-project-*.json` is ignored)  
- If any key was ever pushed accidentally, **rotate it** in OpenAI / Google / Razorpay / Gmail  

---

## Docs index

| Doc | Purpose |
| --- | --- |
| [`docs/INSTALLATION.md`](docs/INSTALLATION.md) | Full install & run guide |
| [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md) | Admin / Staff / Student usage |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Codebase map for developers |
| [`deploy/DEPLOY.md`](deploy/DEPLOY.md) | Vercel + Railway production deploy |
| [`deploy/railway.env.example`](deploy/railway.env.example) | Backend env vars for Railway |
| [`APP_TEST_GUIDE.txt`](APP_TEST_GUIDE.txt) | Deep manual test scenarios |
| [`backend/README.md`](backend/README.md) | Backend-only notes |

## Production deploy (summary)

- Admin UI → Vercel (`https://campusflow-admin-flame.vercel.app`)
- Student UI → Vercel (`https://campusflow-student-smoky.vercel.app`)
- Backend API → Railway + custom domain (`https://api.bits.bhupeshb7.me`)
- Data → MongoDB Atlas + Redis Cloud

See [`deploy/DEPLOY.md`](deploy/DEPLOY.md) for step-by-step.

---

## Tech stack (short)

- **Frontend:** React, Vite, Tailwind, TanStack Query, Zustand, Socket.IO client  
- **Backend:** Node.js, Express, Mongoose, Zod, BullMQ, Socket.IO, Pino  
- **Data:** MongoDB 7, Redis 7  
- **AI (optional):** OpenAI + Pinecone RAG  

---

## License / academic use

Capstone / academic project for BITS. Keep evaluator access available on the GitHub repository:

https://github.com/bitsgroupadminai/admintool_BITS.git
