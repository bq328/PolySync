# PolySync Runbook

Operational checklist for running PolySync safely in preview and live mode.

## First Run

```bash
cd PolySync
npm install
cp .env.example .env
cp config.preview.template.yaml config.yaml
npm run dev
```

Set at minimum:

- `.env`: `POLYMARKET_PRIVATE_KEY`, `POLYMARKET_ADDRESS`
- `config.yaml`: at least one enabled leader with `address` or `username`

Keep `preview_mode: true` until you have reviewed the preview output.

## Expected Preview Logs

- `[polysync] PolySync starting`
- `[polysync] PREVIEW would copy: ...` when a leader trade matches
- `/health` returns `status: ok`

## Health And Dashboard

```bash
curl -s http://127.0.0.1:8080/health
```

If `DASHBOARD_TOKEN` is set, API writes require:

```bash
Authorization: Bearer <DASHBOARD_TOKEN>
```

Bind public interfaces only behind a trusted reverse proxy.

## Live Checklist

Before live mode:

1. Use a dedicated wallet with limited funds.
2. Complete a preview run and review skipped/copied trades.
3. Confirm leader filters and daily caps.
4. Set:

```bash
POLYSYNC_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING
```

5. Change `preview_mode: false`.
6. Restart and manually verify the first order on Polymarket.

## Operations

```bash
npm run dev       # local daemon
npm run build     # production build
npm start         # build daemon and run dist/index.js
npm test          # test suite
```

Docker:

```bash
docker compose up -d --build
docker compose logs -f
```

## Troubleshooting

| Symptom | Check |
|---------|-------|
| No copied trades | Leader enabled, recent activity, `max_trade_age_hours`, filters |
| Live blocked | `POLYSYNC_LIVE_CONFIRM` and `preview_mode: false` |
| API exposed error | Set `DASHBOARD_TOKEN` or bind to `127.0.0.1` |
| Username lookup fails | Use the leader proxy wallet address directly |
| Order rejected | Balance, allowance, tick size, min order size |
| Repeated skips | Risk caps, kill switch, market filters, slippage |

## State

Default SQLite files remain under `data/` for compatibility:

- Preview: `data/preview.db`
- Live: `data/polymirror.db`
- Multi-account: `data/accounts/<account-id>/...`

Use `POLYSYNC_DB_PATH` only when you intentionally want a custom path.

## Upgrade

```bash
git pull
npm install
npm run lint
npm test
npm run build
```

Never commit `.env`, `config.yaml`, private keys, API tokens, or generated DBs.
