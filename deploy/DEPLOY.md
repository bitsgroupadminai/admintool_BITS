# Deployment Guide — Vercel (frontends) + Railway (backend)

Chosen domains:

| App | URL |
| --- | --- |
| Admin / Staff | https://eduportal-admin.vercel.app |
| Student | https://eduportal-student.vercel.app |
| Backend API | https://YOUR-RAILWAY-APP.up.railway.app (set after Railway deploy) |

Deploy order for this project: **frontends first**, then backend.

---

## Phase 1 — Frontend Admin (Vercel)

1. Push latest code to GitHub.
2. Vercel → **Add New Project** → import repo.
3. Configure:
   - **Root Directory:** `frontend-admin`
   - **Framework:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Project name / domain: `eduportal-admin` → `eduportal-admin.vercel.app`
5. Environment Variables (Production) — can use placeholder until Railway is ready:

```env
VITE_API_BASE_URL=https://YOUR-RAILWAY-APP.up.railway.app/api/v1
VITE_SOCKET_URL=https://YOUR-RAILWAY-APP.up.railway.app
```

6. Deploy.
7. After backend exists, update these two vars to the real Railway URL and **Redeploy**.

`vercel.json` already rewrites SPA routes to `index.html`.

---

## Phase 2 — Frontend Student (Vercel)

Same as admin, but:

- **Root Directory:** `frontend-student`
- Domain: `eduportal-student.vercel.app`
- Same `VITE_API_BASE_URL` / `VITE_SOCKET_URL` values as admin

---

## Phase 3 — Backend (Railway)

1. Railway → New Project → Deploy from GitHub repo.
2. Set **Root Directory** to `backend` (important).
3. Railway will use `backend/Dockerfile` + `backend/railway.toml`.
4. Open **Variables** and paste from `deploy/railway.env.example`.
5. Required values you must fill:

| Key | Value |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `REDIS_URL` | Redis Cloud connection string |
| `SESSION_SECRET` | Long random string (≥16 chars) |
| `ADMIN_CLIENT_URL` | `https://eduportal-admin.vercel.app` |
| `STUDENT_CLIENT_URL` | `https://eduportal-student.vercel.app` |
| `NODE_ENV` | `production` |

6. Generate a public domain in Railway (Settings → Networking).
7. Copy that URL, e.g. `https://eduportal-api.up.railway.app`.
8. Set `PUBLIC_API_URL` to that URL (optional but useful).
9. Update **both Vercel projects** env vars to point at this API, then redeploy frontends.
10. Smoke test: `GET https://YOUR-RAILWAY-APP.up.railway.app/api/v1/health`

---

## CORS / cookies (already configured in code)

- Backend allows only `ADMIN_CLIENT_URL` + `STUDENT_CLIENT_URL` (+ optional `EXTRA_CORS_ORIGINS`)
- Production cookies use `SameSite=None; Secure` so Vercel → Railway auth works
- Frontends call API with `withCredentials: true`
- Avatars under `/uploads/...` resolve against the Railway origin

---

## Local vs production

| Mode | API URL |
| --- | --- |
| Local `npm run dev` | Leave `VITE_*` unset → Vite proxies `/api` to `localhost:5001` |
| Vercel production | Set `VITE_API_BASE_URL` + `VITE_SOCKET_URL` to Railway |

---

## Checklist before demo

- [ ] Admin Vercel live on `eduportal-admin.vercel.app`
- [ ] Student Vercel live on `eduportal-student.vercel.app`
- [ ] Railway health endpoint OK
- [ ] Atlas + Redis reachable from Railway
- [ ] Frontend env vars updated to real Railway URL + redeployed
- [ ] Admin signup/login works (cookies)
- [ ] Student login works
- [ ] Socket/chat works (if testing chat)

---

## Files added for deploy

```text
frontend-admin/vercel.json
frontend-admin/.env.example
frontend-admin/.env.production.example
frontend-student/vercel.json
frontend-student/.env.example
frontend-student/.env.production.example
backend/Dockerfile
backend/railway.toml
backend/.dockerignore
deploy/railway.env.example
deploy/DEPLOY.md
```
