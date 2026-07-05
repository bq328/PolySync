# PolySync

**PolySync** is a self-hosted Polymarket trade sync engine. It watches one or
more leader wallets, scales matching trades with per-leader rules, and applies
shared risk controls before previewing or placing orders.

[![CI](https://github.com/bq328/PolySync/actions/workflows/ci.yml/badge.svg)](https://github.com/bq328/PolySync/actions/workflows/ci.yml)

## 中文说明

PolySync 是一个自托管的 Polymarket 跟单同步工具，用于监听一个或多个
Leader 钱包，并按你设置的比例、固定金额、过滤条件和风险上限来预览或执行跟单。

项目默认以 **Preview 预览模式** 运行，不会真实下单。首次使用建议先完成：

1. 复制 `.env.example` 为 `.env`，填写钱包、Dashboard Token、Telegram 凭证等本地配置。
2. 复制 `config.preview.template.yaml` 为 `config.yaml`，配置 Leader、仓位比例、过滤条件和风险限制。
3. 运行 `npm run dev`，打开 Dashboard 检查账户、Leader、活动记录和通知设置。
4. 点击 Telegram 的“发送测试消息”，确认机器人能正常推送。
5. Preview 跑通并确认风控后，再考虑开启实盘模式。

实盘交易需要显式设置 `POLYSYNC_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING`
并把 `config.yaml` 里的 `preview_mode` 改为 `false`。请使用低余额专用钱包，
先小额测试，确认余额、授权、代理网络、Telegram 告警和熔断设置都正常后再扩大规模。

## What It Does

| Area | Summary |
|------|---------|
| Leaders | Track proxy wallet addresses or resolve Polymarket usernames |
| Sizing | `PERCENTAGE`, `FIXED`, `ADAPTIVE`, and tiered multipliers |
| Risk | Daily volume caps, max order size, max markets, slippage, kill switch |
| Modes | Preview by default; Live requires explicit confirmation |
| Dashboard | Local web UI on the same port as `/health` |
| Storage | SQLite state under `data/` |

## Quick Start

```bash
git clone https://github.com/bq328/PolySync.git PolySync
cd PolySync
npm install
cp .env.example .env
cp config.preview.template.yaml config.yaml
npm run dev
```

Before running live, edit:

- `.env`: wallet, optional Telegram, optional Dashboard token
- `config.yaml`: leaders, sizing, filters, risk limits

Preview mode is enabled in the template and does not place real orders.

## Dashboard

When `health_port` is enabled, open:

```text
http://127.0.0.1:8080/
```

Use `DASHBOARD_TOKEN` in `.env` before exposing the API outside localhost.

## Docker

```bash
cp .env.example .env
cp config.example.yaml config.yaml
docker compose up -d --build
docker compose logs -f
```

Manual image build:

```bash
docker build -t polysync:1.0.0 .
```

## Live Trading

Live mode is intentionally gated. Use a dedicated low-balance wallet, complete a
preview run first, then set:

```bash
POLYSYNC_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING
```

Then set `preview_mode: false` in `config.yaml` and restart. Legacy
`POLYMIRROR_LIVE_CONFIRM` and `POLYMIRROR_DB_PATH` are still accepted for
upgrades, but new deployments should use `POLYSYNC_*`.

## Common Commands

```bash
npm run dev              # run the engine locally
npm run dev:dashboard    # Vite dashboard dev server
npm run build            # TypeScript + dashboard build
npm run lint             # typecheck
npm test                 # test suite
npm run audit            # critical-level npm audit
```

## Important Files

| Path | Purpose | Commit? |
|------|---------|---------|
| `.env` | Secrets and local runtime options | No |
| `config.yaml` | Leaders, modes, risk and execution config | No |
| `config.example.yaml` | General template | Yes |
| `config.preview.template.yaml` | Safer preview-first template | Yes |
| `data/` | SQLite state | No |

## Documentation

- [User guide](docs/USER_GUIDE.md)
- [Runbook](docs/RUNBOOK.md)
- [Preview checklist](docs/PREVIEW_CHECKLIST.md)
- [Security notes](docs/SECURITY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Changelog](CHANGELOG.md)

## License

MIT. PolySync is based on the original PolyMirror project and keeps the MIT
license notice.
