# Security notes

## Current GitHub tip (latest commit)

- `backend/.env` is **not** on the remote tip  
- `backend/.env.example` on latest tip uses **placeholders only**  
- Local secret files (`backend/.env`, `study-project-*.json`) are gitignored / untracked  

## Important history warning

An older pushed commit (`b290ee0`) contained real values inside `backend/.env.example`:

- SMTP app password  
- Razorpay **test** key id/secret  

Latest commit replaced those with placeholders, but **git history still contains the old values**.

### What you must do

1. **Rotate** the Gmail app password used in that old commit  
2. **Rotate / regenerate** the Razorpay test keys from the Razorpay dashboard  
3. Do not reuse those old values anywhere  

Optional (advanced, needs explicit approval): rewrite git history with `git filter-repo` / BFG and force-push to purge the old commit content. Prefer rotation even if you rewrite history.

## Never commit

- `backend/.env`
- Real `OPENAI_API_KEY`, SMTP passwords, OAuth secrets, Razorpay secrets
- Google service-account JSON (`study-project-*.json`)
