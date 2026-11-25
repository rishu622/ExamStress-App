# ---- build the frontend
FROM node:22-alpine AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig*.json postcss.config.js tailwind.config.js ./
COPY src ./src
COPY public ./public
RUN npm run build

# ---- run the API (which also serves the built frontend)
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 ENVIRONMENT=production FRONTEND_DIST=/app/dist
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend ./backend
COPY --from=web /app/dist ./dist
RUN useradd --create-home appuser && mkdir -p /data && chown appuser /data
USER appuser
EXPOSE 8000
# PORT is provided by most hosts (Render, Railway, Fly); defaults to 8000.
CMD ["sh", "-c", "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
