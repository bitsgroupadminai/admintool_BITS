# BITS Platform

Workflow-first educational administration platform with two separate frontends:

- **Admin & staff portal** — institute setup, services, offerings, workflow configuration
- **Student portal** — separate domain (in development)

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

# Admin & staff portal (new terminal)
cd frontend-admin
npm install
npm run dev

# Student portal (new terminal)
cd frontend-student
npm install
npm run dev
```

- Admin portal: http://localhost:5173
- Student portal: http://localhost:5174
- API: http://localhost:5001/api/v1

## Test flow (admin portal)

1. Open `/signup` — create institute + first admin
2. Complete setup wizard (institute name → optional staff → review)
3. Land on admin dashboard → **Manage services**
4. Set `OPENAI_API_KEY` in `backend/.env` for document-aware AI (optional; falls back to heuristics)
5. Create a service → upload PDF/DOCX knowledge docs → **Generate understanding** → review suggested offerings → create an offering
6. Configure offering (Eligibility → Documents → Workflow → Queue → Review → Activate) with per-step AI assist
7. Add staff from setup or log in as staff with credentials set by admin

## Project structure

- `backend/` — Express modular monolith (auth, users, institutes, services, offerings)
- `frontend-admin/` — React + Vite + Tailwind admin/staff portal
- `frontend-student/` — React + Vite + Tailwind student portal (separate domain)

## Environment

Backend CORS allows both portal origins via:

- `ADMIN_CLIENT_URL` (default: http://localhost:5173)
- `STUDENT_CLIENT_URL` (default: http://localhost:5174)

See `tech stack and project guidelines.md` and `PRD Admin Tool NEW.md` for full product scope.
