# Vercel Admin Portal checklist

## Required project settings

1. Vercel → **campusflow-admin** → Settings → General
2. **Root Directory** = `frontend-admin`
3. Framework Preset = Vite
4. Build Command = `npm run build`
5. Output Directory = `dist`
6. Install Command = `npm install`

## Env vars (Production + Preview)

```env
VITE_API_BASE_URL=https://api.bits.bhupeshb7.me/api/v1
VITE_SOCKET_URL=https://api.bits.bhupeshb7.me
```

Must include `https://`.

## After changing env

Deployments → Redeploy (**uncheck** "Use existing Build Cache" if available).

## Confirm live

`https://campusflow-admin-flame.vercel.app/login`
