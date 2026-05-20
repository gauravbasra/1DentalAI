# 1DentalAI

1DentalAI is the new production-grade dental AI operating system project.

This repo is intentionally separate from DentalRCM. DentalRCM currently runs on the droplet at `http://162.243.186.191:3000/`; 1DentalAI is designed to run as an independent service on port `3001` and be reverse-proxied from `http://162.243.186.191/`.

## Current State

Phase 0 bootstrap only:

- Next.js App Router app
- TypeScript
- Tailwind CSS
- Health endpoint at `/api/health`
- Production start script bound to `127.0.0.1:${PORT:-3001}`
- AGENTS.md phase-gated development rules

No product module is considered implemented yet. The visible app reports only truthful infrastructure and phase status.

## Commands

```bash
npm install
npm run lint
npm run build
PORT=3001 npm run start
```

## DigitalOcean Topology

Target:

- Public app URL: `http://162.243.186.191/`
- 1DentalAI service: `127.0.0.1:3001`
- Existing DentalRCM service: `http://162.243.186.191:3000/`

The deployment must not stop, replace, or bind over DentalRCM on port `3000`.

## Next Required Approval

Create and approve the Phase 0 architecture packet before product coding:

- Repo strategy
- DentalRCM reuse boundary
- Phone app scan
- Deployment topology
- Connector extraction decision
- Initial database/environment strategy
