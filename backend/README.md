# Backend API

Express modular monolith for the BITS Edu Admin platform.

## Run

```bash
copy .env.example .env   # then fill values
npm install
npm run dev              # http://localhost:5001
```

Health: `GET /api/v1/health`

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | API + workers with `--watch` |
| `npm start` | Production-style start |
| `npm test` | Node built-in test runner |
| `npm run google:oauth-setup` | Optional Google Meet OAuth helper |

## Notes

- Redis is required for sessions and BullMQ queues.
- Never commit `.env`. Use placeholders from `.env.example` only.
