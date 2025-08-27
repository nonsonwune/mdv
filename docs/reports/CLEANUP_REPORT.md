
# Repository Cleanup Report (2025-08-27)

## Criteria Used

- Unused: not referenced by entry points, routes, tests, scripts, or runtime loaders
- Not included in build artifacts (Next.js/.next, Docker CMD references, Railway start commands)
- Outdated/duplicate: files named *backup*, *fixed*, *old*, *.bak, debug Dockerfiles
- Transient runtime artifacts: *.log, *.pid, dev SQLite DB

## Moved Files

- redundant_files/.gitkeep: Redundant by naming/usage analysis
- redundant_files/Dockerfile.backend.debug: Debug Dockerfile not used by Railway or builds
- redundant_files/Dockerfile.web.fixed: Generated helper Dockerfile; not used by Railway/web builds
- redundant_files/api.log: Runtime log; transient, not used by code
- redundant_files/backend/api-dev.log: Runtime log; transient, not used by code
- redundant_files/backend/api/main_backup.py: Superseded API entry variants; Dockerfile and Railway use backend/start.py
- redundant_files/backend/api/main_fixed.py: Superseded API entry variants; Dockerfile and Railway use backend/start.py
- redundant_files/backend/api/routers/reviews_old.py: Backup/old variant not referenced by app
- redundant_files/backend/api/routers/wishlist_old.py: Backup/old variant not referenced by app
- redundant_files/backend/backend.log: Runtime log; transient, not used by code
- redundant_files/backend/backend_new.log: Runtime log; transient, not used by code
- redundant_files/backend/backend_server.log: Runtime log; transient, not used by code
- redundant_files/backend/mdv_dev.db: Dev SQLite database file; not required for builds
- redundant_files/backend/server.log: Runtime log; transient, not used by code
- redundant_files/backend/start_backup.py: Superseded startup scripts; Railway uses backend/start.py
- redundant_files/backend/start_fixed.py: Superseded startup scripts; Railway uses backend/start.py
- redundant_files/run/api.pid: Runtime PID file; transient, not source-controlled input
- redundant_files/run/web.log: Runtime log; transient, not used by code
- redundant_files/run/web.pid: Runtime PID file; transient, not source-controlled input
- redundant_files/run/worker.log: Runtime log; transient, not used by code
- redundant_files/run/worker.pid: Runtime PID file; transient, not source-controlled input
- redundant_files/web.log: Runtime log; transient, not used by code
- redundant_files/web/frontend.log: Runtime log; transient, not used by code
- redundant_files/web/next-dev.log: Runtime log; transient, not used by code

## Needs Manual Review

- None

## Additional Moves
- redundant_files/backend/Dockerfile: Legacy Dockerfile not used by current Dockerfile.backend
- redundant_files/backend/Procfile: Legacy Procfile superseded by root Procfile
- redundant_files/backend/railway.json: Legacy Railway config superseded by root railway.json
- redundant_files/backend/start.sh: Legacy start script; Dockerfile.backend uses backend/start.py
- redundant_files/backend/start_backend.sh: Dev helper, not used in builds
- redundant_files/backend/start_worker.sh: Dev helper, not used in builds
- redundant_files/backend/test.png: Test artifact
- redundant_files/web/cookies.txt: Local cookie export, not used in code
- redundant_files/web/test-results/.last-run.json: Playwright artifact

## Needs Manual Review
- None
