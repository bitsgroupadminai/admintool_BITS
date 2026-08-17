# Installation Guide

For juniors and new developers: install and run the full platform locally.

## 1. What you need first

| Software | Version | Why |
| --- | --- | --- |
| Node.js | 20+ | Runs backend and both frontends |
| npm | Comes with Node | Installs packages |
| Docker Desktop | Latest stable | Runs MongoDB + Redis |
| Git | Any recent | Clone the repo |
| Browser | Chrome / Edge | Use the portals |

RAM tip: 8 GB+ is comfortable when Docker + 3 Node apps run together.

## 2. Clone the project

```bash
git clone https://github.com/bitsgroupadminai/admintool_BITS.git
cd admintool_BITS
```

## 3. Start databases (MongoDB + Redis)

From the **project root** (folder that contains `docker-compose.yml`):

```bash
docker compose up -d
```

This starts:

- MongoDB → `localhost:27017`
- Redis → `localhost:6379`

Check in Docker Desktop that both containers are running.

Stop later:

```bash
docker compose down
```

## 4. Configure backend `.env`

```bash
cd backend
copy .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

Open `backend/.env` and set at least:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/admintool
REDIS_URL=redis://127.0.0.1:6379
SESSION_SECRET=replace-with-a-long-random-string
ADMIN_CLIENT_URL=http://localhost:5173
STUDENT_CLIENT_URL=http://localhost:5174
```

### Optional keys (features work without them, with limited AI/email/pay)

| Feature | Variables |
| --- | --- |
| AI suggestions / verification / chat | `OPENAI_API_KEY` |
| Better chatbot (RAG) | `PINECONE_API_KEY`, `PINECONE_INDEX` |
| Email | `RESEND_API_KEY`, `EMAIL_FROM` (SMTP `SMTP_*` backup) |
| Payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| Google Meet | `GOOGLE_OAUTH_*` |

**Never commit `backend/.env`.** Only commit `.env.example` (placeholders).

## 5. Run backend

```bash
cd backend
npm install
npm run dev
```

- API: http://localhost:5001  
- Health: http://localhost:5001/api/v1/health  

Keep this terminal open.

## 6. Run Admin & Staff portal

New terminal:

```bash
cd frontend-admin
npm install
npm run dev
```

Open: http://localhost:5173

## 7. Run Student portal

New terminal:

```bash
cd frontend-student
npm install
npm run dev
```

Open: http://localhost:5174

## 8. First successful smoke test

1. Admin signup → create institute  
2. Finish setup wizard (institute → staff → review)  
3. Create a service → upload a PDF/DOCX knowledge file  
4. Create offering → fill wizard → **Activate**  
5. Student portal → apply / enroll  
6. Staff login → review application  

More detailed flows: see root `APP_TEST_GUIDE.txt` and `docs/USER_MANUAL.md`.

## 9. Ports cheat-sheet

| App | Port |
| --- | --- |
| Backend API | 5001 |
| Admin / Staff UI | 5173 |
| Student UI | 5174 |
| MongoDB | 27017 |
| Redis | 6379 |

## 10. Common errors

| Problem | Fix |
| --- | --- |
| Backend crash on start | Start Docker: `docker compose up -d` |
| Login / CORS cookie issues | `ADMIN_CLIENT_URL` and `STUDENT_CLIENT_URL` must match UI URLs |
| `npm install` fails | Upgrade to Node 20+ |
| AI features empty | Add `OPENAI_API_KEY` or continue without AI |
| Port already in use | Stop other process using that port |

## 11. Tests

```bash
cd backend
npm test
```

## 12. Security reminder

- Do not put real API keys into GitHub  
- Do not zip `node_modules` or `.env` for submission  
- If a key was ever pushed by mistake, **rotate it** in the provider dashboard  

Next: read `docs/ARCHITECTURE.md` to understand folders, then `docs/USER_MANUAL.md` to use the product.
