# BITS Platform — Smart Workflow-Based Queue & Administrative Service Management System

Workflow-first educational administration platform with three runnable parts:

- **Backend API** (`backend/`) — Express modular monolith (auth, services, offerings, applications, queue, appointments, AI verification, chat, payments, monitoring)
- **Admin & staff portal** (`frontend-admin/`) — institute setup, service/offering configuration, review, operations
- **Student portal** (`frontend-student/`) — enrollment, applications, guidance chat, queue/appointments

## Prerequisites

- Node.js **20+**
- npm
- Docker Desktop (for MongoDB + Redis)
- Git
- Modern browser (Chrome / Edge)

## Quick start

```bash
# 1) Start databases
docker compose up -d

# 2) Backend
cd backend
copy .env.example .env    # Windows
# cp .env.example .env    # macOS / Linux
# Edit .env — at least SESSION_SECRET, MONGODB_URI, REDIS_URL
npm install
npm run dev

# 3) Admin & staff portal (new terminal)
cd frontend-admin
npm install
npm run dev

# 4) Student portal (new terminal)
cd frontend-student
npm install
npm run dev
```

| App | URL |
| --- | --- |
| Admin / Staff portal | http://localhost:5173 |
| Student portal | http://localhost:5174 |
| Backend API | http://localhost:5001/api/v1 |
| Health check | http://localhost:5001/api/v1/health |

## Environment variables (backend)

Copy `backend/.env.example` → `backend/.env`. Never commit `.env`.

| Variable | Required for demo? | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection |
| `REDIS_URL` | Yes | Sessions + BullMQ workers |
| `SESSION_SECRET` | Yes | Session signing |
| `ADMIN_CLIENT_URL` | Yes | CORS / cookies for admin UI |
| `STUDENT_CLIENT_URL` | Yes | CORS / cookies for student UI |
| `OPENAI_API_KEY` | Optional | AI extraction, verification, chat |
| `PINECONE_API_KEY` | Optional | RAG vector search for chatbot |
| `SMTP_*` | Optional | Email notifications / password reset |
| `RAZORPAY_*` | Optional | Fee payments |
| `GOOGLE_OAUTH_*` | Optional | Google Meet for virtual appointments |
| `AI_VERIFICATION_ENABLED` | Optional | Enable AI document/eligibility worker |

Without OpenAI/Pinecone/SMTP/Razorpay the core workflow still runs; AI/email/payment features degrade gracefully.

## Tests

```bash
cd backend
npm test
```

Unit tests cover AI verification decision thresholds, eligibility decision helpers, workflow step permissions, and verification schemas.

Manual end-to-end flows: see `APP_TEST_GUIDE.txt` and `final-submission-doc/02-Test_Cases.md`.

## Project structure

```text
backend/                 API + workers
frontend-admin/          Admin & staff React app
frontend-student/        Student React app
docker-compose.yml       MongoDB 7 + Redis 7
knowledge-bases/         Sample institute policy texts (demo)
final-submission-doc/    Capstone submission documents
```

## Security notes for packaging / zip

Do **not** include in any submission zip:

- `**/node_modules/`
- `backend/.env` or any real secrets
- `backend/uploads/`
- `study-project-*.json` (Google service-account keys)
- `backend/credentials/`

See `final-submission-doc/09-Code_Zip_Instructions.md`.

## Documentation

Full submission pack: `final-submission-doc/`

- Project report draft, test cases, validation report
- User manual, installation guide
- Presentation outline, demo script, GitHub/demo links
- Plagiarism compliance declaration

Product/PRD references: `PRD Admin Tool NEW.md`, `tech stack and project guidelines.md`.
