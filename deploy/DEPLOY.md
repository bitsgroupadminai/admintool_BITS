# Deployment Guide — Vercel (frontends) + Railway (backend)

Chosen domains:

| App | URL |
| --- | --- |
| Admin / Staff | https://campusflow-admin-flame.vercel.app |
| Student | https://campusflow-student-smoky.vercel.app |
| Backend API | https://api.bits.bhupeshb7.me |

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
4. Project name / domain: `campusflow-admin-flame`
5. Environment Variables (Production):

```env
VITE_API_BASE_URL=https://api.bits.bhupeshb7.me/api/v1
VITE_SOCKET_URL=https://api.bits.bhupeshb7.me
```

6. Deploy.

`vercel.json` already rewrites SPA routes to `index.html`.

---

## Phase 2 — Frontend Student (Vercel)

Same as admin, but:

- **Root Directory:** `frontend-student`
- Domain: `campusflow-student-smoky.vercel.app`
- Same `VITE_API_BASE_URL` / `VITE_SOCKET_URL` values as admin

---

## Phase 3 — Backend (Railway)

1. Railway → New Project → Deploy from GitHub repo.
2. **CRITICAL:** Settings → **Root Directory** = `backend` (or use root `railway.toml` monorepo start).
3. Builder uses Railpack / Nixpacks.
4. Open **Variables** → Raw Editor → paste from local `deploy/railway.env` (gitignored) or `deploy/railway.env.example`.
5. Atlas Network Access: allow `0.0.0.0/0` for demo.
6. Networking → custom domain: `api.bits.bhupeshb7.me` (also keep Railway default URL if needed).
7. Set `PUBLIC_API_URL=https://api.bits.bhupeshb7.me` on Railway.
8. Smoke test: `GET https://api.bits.bhupeshb7.me/health` and `GET https://api.bits.bhupeshb7.me/api/v1/health`
9. Confirm both Vercel apps use the `VITE_*` values above → Redeploy if changed.

See also: `deploy/RAILWAY_MONOREPO.md`

---

## CORS / cookies (already configured in code)

- Backend allows only `ADMIN_CLIENT_URL` + `STUDENT_CLIENT_URL` (+ optional `EXTRA_CORS_ORIGINS`)
- Production cookies use `SameSite=None; Secure` so Vercel → API auth works
- Frontends call API with `withCredentials: true`
- Avatars under `/uploads/...` resolve against the API origin

---

## Local vs production

| Mode | API URL |
| --- | --- |
| Local `npm run dev` | Leave `VITE_*` unset → Vite proxies `/api` to `localhost:5001` |
| Vercel production | Set `VITE_API_BASE_URL` + `VITE_SOCKET_URL` to `https://api.bits.bhupeshb7.me` |

---

## Checklist before demo

- [ ] Admin Vercel live on `campusflow-admin-flame.vercel.app`
- [ ] Student Vercel live on `campusflow-student-smoky.vercel.app`
- [ ] API health OK on `https://api.bits.bhupeshb7.me/health`
- [ ] Atlas + Redis reachable from Railway
- [ ] Frontend env vars point at custom API domain + redeployed
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
