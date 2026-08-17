# Vercel Student Portal checklist

If `/login` refresh shows Vercel `404 NOT_FOUND`, the project is not using `frontend-student/vercel.json`.

## Required project settings

1. Vercel → **campusflow-student** → Settings → General
2. **Root Directory** = `frontend-student`  ← must match exactly
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

## After changing Root Directory or env

Deployments → Redeploy (**uncheck** "Use existing Build Cache" if available).

## Confirm rewrite is live

After deploy, hard refresh:
`https://campusflow-student-smoky.vercel.app/login`

Should show the login page, not Vercel 404.
