# Deployment

## DigitalOcean Droplet

1DentalAI is deployed as a separate service from DentalRCM.

Expected process layout:

- DentalRCM: existing process on port `3000`
- 1DentalAI: new systemd service on `127.0.0.1:3001`
- Nginx: proxies `http://162.243.186.191/` to `127.0.0.1:3001`

## Systemd Service

Service name:

```text
1dentalai.service
```

Working directory:

```text
/var/www/1DentalAI
```

Runtime command:

```bash
npm run start
```

Environment:

```text
NODE_ENV=production
PORT=3001
```

## Health Check

```bash
curl -fsS http://127.0.0.1:3001/api/health
curl -fsS http://162.243.186.191/api/health
```

Both should return JSON with:

```json
{
  "ok": true,
  "app": "1DentalAI",
  "phase": "phase-0-bootstrap"
}
```
