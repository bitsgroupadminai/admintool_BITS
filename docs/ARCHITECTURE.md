# Architecture & Code Guide (for juniors)

This explains **how the repo is organized** and **how a request flows** through the system.

## 1. Big picture

There are **3 apps + 2 databases**:

```text
Browser
  ├─ frontend-admin   (:5173)  Admin + Staff UI
  └─ frontend-student (:5174)  Student UI
           │
           ▼
      backend API     (:5001)  Express modular monolith
           │
     ┌─────┴─────┐
     ▼           ▼
 MongoDB      Redis
 (data)   (sessions, BullMQ jobs, cache)
```

Optional external services:

- OpenAI → AI extraction / verification / chat  
- Pinecone → vector search for RAG chatbot  
- SMTP → email  
- Razorpay → payments  
- Google OAuth → Meet links for virtual appointments  

## 2. Folder map

```text
admintool_BITS/
├── backend/                 # API + background workers
│   ├── src/
│   │   ├── app.js           # Express app + route mounting
│   │   ├── server.js        # Process start, sockets, workers
│   │   ├── core/            # config, queues, workers, session, middleware
│   │   ├── modules/         # feature modules (auth, offerings, applications, ...)
│   │   └── shared/          # helpers, prompts, schemas, enums
│   ├── tests/               # unit tests (npm test)
│   └── .env.example         # safe placeholders only
├── frontend-admin/          # React admin/staff portal
├── frontend-student/        # React student portal
├── docs/                    # Installation, User Manual, Architecture
├── docker-compose.yml       # MongoDB + Redis
├── APP_TEST_GUIDE.txt       # End-to-end manual test script
└── README.md                # Start here
```

## 3. Backend modules (what each one does)

| Module area | Responsibility |
| --- | --- |
| `auth` / `users` | Signup, login, sessions, roles |
| `institutes` | Institute setup & settings |
| `services` + knowledge docs | Create services, upload policy files |
| `offerings` | Configure eligibility, docs, workflow, queue; activate |
| `applications` | Student submissions + staff review lifecycle |
| `ai-verification` | AI document/eligibility decisions + thresholds |
| `queue` / `appointments` | Visit handling |
| `chat` | Student guidance chatbot + sockets |
| `payments` | Fee orders (Razorpay) |
| `notifications` | In-app / email notifications |
| `monitoring` | Health + metrics |
| `exports` / `erp-sync` | Data export and ERP hooks |

Pattern inside a module (typical):

```text
*.router.js → *.controller.js → *.service.js → *.model.js
```

Validation often uses Zod DTOs/validators before service logic.

## 4. Important design ideas

### 4.1 Session auth (not JWT primary)

- Login creates a session stored in **Redis**
- Browser keeps an HTTP-only cookie
- Middleware checks session on protected routes

### 4.2 Workflow snapshot

When a student applies, the offering workflow is **copied into the application**.  
Later admin edits to the offering do **not** break old applications.

### 4.3 AI with human escalation

AI returns:

- verdict (`pass` / `fail` / `uncertain`)
- confidence score
- reasons

Code decides:

- high-confidence pass → approve  
- high-confidence fail → return for correction  
- low confidence / uncertain → **escalate to staff**

Thresholds come from env (example: approve `0.85`, reject `0.80`).

### 4.4 Hybrid queue / appointment

An offering can be:

- `queue_only`
- `appointment_only`
- `hybrid` (student chooses)

### 4.5 Background workers (BullMQ + Redis)

Heavy/async work runs in workers, for example:

- email sending  
- AI verification  
- embeddings  
- SLA / operations jobs  

## 5. Frontend overview

### Admin (`frontend-admin`)

- Signup / login / setup wizard  
- Services & offering configure pages  
- Applications review, queue board, appointments  
- Students, analytics, system health  

### Student (`frontend-student`)

- Institute home / enrollment  
- Services browse + apply  
- Document upload + request history  
- Chat / guidance  
- Queue join or appointment booking  

Both use React + Vite + API calls to `/api/v1/...`.

## 6. Request lifecycle (happy path)

```text
1. Admin creates Service + Offering → Activate
2. Student applies + uploads documents
3. Workflow steps run (Staff and/or AI)
4. If returned → student fixes → resubmits
5. When visit-ready → queue or appointment
6. Staff completes visit / final approval
7. Student sees final status in history
```

## 7. Where to change what (quick map)

| I want to change… | Look here |
| --- | --- |
| API routes | `backend/src/app.js` + `backend/src/modules/**/**.router.js` |
| Login / session | `backend/src/modules/auth`, `backend/src/core/services/session.service.js` |
| Offering activation rules | `backend/src/modules/offerings` |
| Application workflow actions | `backend/src/modules/applications`, `shared/helpers/workflowExecution.helper.js` |
| AI approve/return/escalate | `backend/src/modules/ai-verification/ai-verification.decision.js` |
| Chat / RAG | `backend/src/modules/chat`, `shared/services/rag.service.js` |
| Admin UI pages | `frontend-admin/src/pages` + `routes/AppRoutes.jsx` |
| Student UI pages | `frontend-student/src/pages` + `routes/AppRoutes.jsx` |
| Env variables | `backend/.env.example`, `backend/src/core/config/env.js` |

## 8. Local commands cheat-sheet

```bash
docker compose up -d
cd backend && npm install && npm run dev
cd frontend-admin && npm install && npm run dev
cd frontend-student && npm install && npm run dev
cd backend && npm test
```

## 9. Safe coding rules for juniors

1. Never commit `.env` or real keys  
2. Put new features in a module folder, not random root files  
3. Keep admin and student portals separate  
4. Prefer escalating uncertain AI decisions to staff  
5. Write/update a short note in PR if you change env vars  

Next steps:

1. Finish setup with `docs/INSTALLATION.md`  
2. Click through roles with `docs/USER_MANUAL.md`  
3. Run one end-to-end flow from `APP_TEST_GUIDE.txt`
