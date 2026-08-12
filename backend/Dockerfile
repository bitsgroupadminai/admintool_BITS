# Simplified Docker build (optional). Prefer Nixpacks on Railway.
# If you use Docker: Railway Root Directory MUST be `backend`.

FROM node:20-bookworm-slim
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts
RUN mkdir -p uploads/knowledge uploads/applications uploads/avatars

ENV NODE_ENV=production
ENV PORT=5001
EXPOSE 5001

CMD ["npm", "start"]
