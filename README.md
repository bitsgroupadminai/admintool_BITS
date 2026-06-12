# Admin Tool (BITS)

Workflow-first educational administration platform — **Sections 1–3** implemented:

- **§1 Authentication & access control** — email/password login, admin signup, staff creation, Redis sessions, RBAC
- **§2 Admin onboarding** — mandatory setup flow (institute → staff → review)
- **§3 Service, offering & workflow configuration** — services, offerings wizard, PDF/DOCX knowledge upload, OpenAI-powered insights & suggestions (review before apply), eligibility, documents, workflow timeline, queue/SLA, activation

## Prerequisites

- Node.js 20+
- Docker (for MongoDB + Redis)

## Quick start

```bash
# Start databases
docker compose up -d

# Backend
cd backend
cp .env.example .env   # if needed
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:5000/api/v1

## Test flow

1. Open `/signup` — create institute + first admin
2. Complete setup wizard (institute name → optional staff → review)
3. Land on admin dashboard → **Manage services**
4. Set `OPENAI_API_KEY` in `backend/.env` for document-aware AI (optional; falls back to heuristics)
5. Create a service → upload PDF/DOCX knowledge docs → **Generate understanding** → review suggested offerings → create an offering
6. Configure offering (Eligibility → Documents → Workflow → Queue → Review → Activate) with per-step AI assist
6. Add staff from setup or log in as staff with credentials set by admin

## Project structure

- `backend/` — Express modular monolith (auth, users, institutes)
- `frontend/` — React + Vite + Tailwind + ShadCN-style UI

See `tech stack and project guidelines.md` and `PRD Admin Tool NEW.md` for full product scope.
