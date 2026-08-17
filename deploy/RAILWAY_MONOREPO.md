# Railway monorepo + env setup

## How Railway picks only the backend from one GitHub repo

Your build log showed Railway analyzing the **repo root** (it listed `backend/`, `frontend-admin/`, etc.). That means **Root Directory was empty**.

### Fix (do ONE of these)

**Option A — Best (Railway UI)**  
Service → Settings → **Root Directory** = `backend` → Redeploy

**Option B — Code fallback (already added)**  
Root `railway.toml` + root `package.json` install/start the backend even when Root Directory is empty:

```text
build:  npm --prefix backend ci --omit=dev --legacy-peer-deps
start:  npm --prefix backend start
```

### Atlas Network Access

In MongoDB Atlas → Network Access → add `0.0.0.0/0` (allow Railway IPs) for demo.

### Redis TLS

If Redis fails to connect with `redis://`, change to:

```env
REDIS_URL=rediss://default:PASSWORD@HOST:PORT
```

### After backend is live

1. Use the custom API domain (or Railway public URL): `https://api.bits.bhupeshb7.me`
2. Set on **both** Vercel projects:

```env
VITE_API_BASE_URL=https://api.bits.bhupeshb7.me/api/v1
VITE_SOCKET_URL=https://api.bits.bhupeshb7.me
```

3. Redeploy both Vercel apps
