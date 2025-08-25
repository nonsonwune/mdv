# DevOps & Deployment Check

Current state
- docker-compose.yml: Postgres (5432) and Redis (6379) with volumes and health checks.
- Railway: railway.json declares services (mdv-api, mdv-worker, mdv-postgres, mdv-redis) and env keys, but no Dockerfiles or start commands are in-repo.
- No CI (e.g., GitHub Actions) present.

Gaps
- No Dockerfiles for API/web, so Railway cannot build/publish services from this repo as-is.
- Web and API are not composed in docker-compose for a one-command local full stack.
- No automated lint/test/build pipeline.

Recommendations
- Add Dockerfile.backend
  - Base python:3.12-slim, install system deps if needed
  - COPY backend/ and install -r backend/requirements.txt
  - ENV PORT=8000
  - CMD: uvicorn backend.api.main:app --host 0.0.0.0 --port ${PORT}
- Add Dockerfile.web
  - Base node:20-alpine, npm ci, next build, next start -p ${PORT} -H 0.0.0.0
  - Use Next.js standalone output to reduce runtime image size
- Railway configuration
  - Service mdv-api: build from Dockerfile.backend; set APP_URL to mdv-web domain; set DB/Redis URLs from managed services
  - Service mdv-web: build from Dockerfile.web; set NEXT_PUBLIC_API_URL to mdv-api domain
  - Ensure secrets are added via Railway variables
- Optional: docker-compose services for api and web (ports 8000 and 3000) for local all-in-one
- CI pipeline (post-MVP)
  - Lint, test, build images; push to registry; Railway deploy on tags or main

