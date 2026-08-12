# Railway monorepo + env setup

## How Railway picks only the backend from one GitHub repo

Your repo has:

```text
admintool_BITS/
├── backend/           ← Railway uses THIS
├── frontend-admin/    ← Vercel project 1
└── frontend-student/  ← Vercel project 2
```

In Railway service settings:

1. **Root Directory** = `backend`  ← required
2. Builder = Nixpacks (from `backend/railway.toml`)
3. Variables = paste from `deploy/railway.env` (local) / Railway Raw Editor

Railway will only install/build/run files under `backend/`.

### If build fails with Docker

We switched to **Nixpacks**. In Railway:

- Settings → Build → Builder: **Nixpacks** (or leave default from railway.toml)
- Do **not** force Dockerfile unless Root Directory is `backend`

Then redeploy.

### Atlas Network Access

In MongoDB Atlas → Network Access → add `0.0.0.0/0` (allow Railway IPs) for demo.

### Redis TLS

If Redis fails to connect with `redis://`, change to:

```env
REDIS_URL=rediss://default:PASSWORD@HOST:PORT
```

### After backend is live

1. Copy Railway public URL, e.g. `https://xxx.up.railway.app`
2. Set on **both** Vercel projects:

```env
VITE_API_BASE_URL=https://xxx.up.railway.app/api/v1
VITE_SOCKET_URL=https://xxx.up.railway.app
```

3. Redeploy both Vercel apps
