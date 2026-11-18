
## Shutdown

`src/index.ts` wraps the server in the bffs-lib `gracefulShutdown`. On SIGTERM it drains the running requests, ends the SSE streams, flushes the telemetry and exits 0; after 10 s it exits 1. The image runs `tini` as PID 1 (`ENTRYPOINT`) so the signal reaches Node. The pod's `preStop` (5 s) and grace period (30 s) live in `Devops/Deploiment`. `tests/mair-682-graceful-shutdown.test.ts` starts the real entry point and sends it SIGTERM.
