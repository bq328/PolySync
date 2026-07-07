# PolySync

Multi-leader copy trading on Polymarket - mirror trades from multiple leader
wallets with per-leader sizing, conflict handling, risk controls, preview mode,
live execution, Telegram alerts, and a local dashboard.

Polymarket 多 Leader 镜像跟单引擎 - 按 Leader 独立配置仓位、过滤条件和风控，
支持 Preview 预览、Live 实盘、本地 Dashboard、Telegram 通知和运行状态持久化。

[![CI](https://github.com/bq328/PolySync/actions/workflows/ci.yml/badge.svg)](https://github.com/bq328/PolySync/actions/workflows/ci.yml)

Version 1.0.0 - self-hosted Polymarket multi-leader copy trading.

---

## Features / 功能

| Feature / 功能 | Description / 说明 |
| --- | --- |
| Multi-leader monitor / 多 Leader 监控 | Track proxy wallet addresses or resolve Polymarket usernames / 监听代理钱包地址，也可解析 Polymarket 用户名 |
| Sizing / 仓位 | `PERCENTAGE`, `FIXED`, `ADAPTIVE`, and tiered multipliers / 支持比例、固定金额、自适应和分层倍率 |
| Risk / 风控 | Daily volume caps, max order size, max markets, slippage, and kill switch / 日交易额、单笔上限、市场数量、滑点和熔断 |
| Conflict / 冲突处理 | Deduplicate copied trades and guard against self-triggered loops / 去重并防止自成交记录触发循环跟单 |
| Preview / 预览 | Default mode simulates orders without placing real trades / 默认模拟运行，不会真实下单 |
| Live / 实盘 | Requires explicit config and `POLYSYNC_LIVE_CONFIRM` / 必须显式配置并设置实盘确认变量 |
| Dashboard / 控制台 | Local UI for accounts, leaders, settings, metrics, start/stop copy, and Telegram tests / 本地界面管理账户、Leader、设置、指标、启停跟单和 Telegram 测试 |
| Notify / 通知 | Telegram copy/error/kill-switch notifications / Telegram 跟单、错误和熔断通知 |
| Persistence / 持久化 | SQLite state under `data/` / SQLite 状态数据保存在 `data/` |

---

## Requirements / 环境要求

- Node.js `>=20` or Docker / Node.js `>=20` 或 Docker
- Polymarket proxy wallet and USDC for Live mode / 实盘需要 Polymarket 代理钱包和 USDC
- Leader proxy wallet addresses or Polymarket usernames / Leader 代理钱包地址或用户名
- Optional Telegram bot token and chat ID / 可选 Telegram Bot Token 和 Chat ID
- Optional HTTPS proxy when your network cannot reach Polymarket APIs directly / 网络无法直连 Polymarket API 时可配置 HTTPS 代理

---

## Quick Start / 快速开始

### Local (Preview Recommended) / 本地运行（建议先 Preview）

```bash
git clone https://github.com/bq328/PolySync.git PolySync
cd PolySync
npm install
cp .env.example .env
cp config.preview.template.yaml config.yaml
npm run dev
```

Open the dashboard / 打开控制台：

```text
http://127.0.0.1:8080/
```

Health check / 健康检查：

```bash
curl http://127.0.0.1:8080/health
```

Before running Live, edit / 开启实盘前请先编辑：

- `.env`: wallet, Dashboard token, Telegram credentials, optional proxy / 钱包、Dashboard Token、Telegram 凭证、可选代理
- `config.yaml`: leaders, sizing, filters, risk limits, and `preview_mode` / Leader、仓位、过滤条件、风控和 `preview_mode`

Preview mode is enabled by default and does not place real orders.
模板默认启用 Preview 预览模式，不会真实下单。

### Docker / 容器运行

```bash
cp .env.example .env
cp config.example.yaml config.yaml
docker compose up -d --build
docker compose logs -f
```

Manual image build / 手动构建镜像：

```bash
docker build -t polysync:1.0.0 .
docker run --env-file .env -v "$PWD/config.yaml:/app/config.yaml" -v "$PWD/data:/app/data" polysync:1.0.0
```

---

## Configuration / 配置

| File / 文件 | Purpose / 用途 | Commit? / 提交到 Git? |
| --- | --- | --- |
| `.env` | Secrets and local runtime options / 密钥和本地运行配置 | No / 否 |
| `config.yaml` | Leaders, modes, risk and execution config / Leader、模式、风控和执行配置 | No / 否 |
| `config.example.yaml` | General template / 通用模板 | Yes / 是 |
| `config.preview.template.yaml` | Safer preview-first template / 更安全的预览优先模板 | Yes / 是 |
| `data/` | SQLite state and runtime data / SQLite 状态和运行数据 | No / 否 |

Example leader config / Leader 配置示例：

```yaml
leaders:
  - name: sample-leader
    address: "0x0000000000000000000000000000000000000000"
    enabled: true
    strategy:
      sizing_mode: PERCENTAGE
      multiplier: 0.1
      max_order_usd: 25
```

Useful environment variables / 常用环境变量：

```bash
DASHBOARD_TOKEN=change-this-token
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
POLYSYNC_DB_PATH=data/custom.db
POLYSYNC_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING
```

Compatibility note / 兼容说明：
legacy `POLYMIRROR_LIVE_CONFIRM` and `POLYMIRROR_DB_PATH` are still accepted for
upgrades, but new deployments should use `POLYSYNC_*`.
旧的 `POLYMIRROR_LIVE_CONFIRM` 和 `POLYMIRROR_DB_PATH` 仍可用于升级兼容，
新部署建议统一使用 `POLYSYNC_*`。

---

## Dashboard / 控制台

The dashboard runs on the same port as `/health` when `health_port` is enabled.
启用 `health_port` 后，Dashboard 与 `/health` 共用端口。

Use it to review account state, leader activity, open-position metrics, global
settings, Telegram delivery, and copy-trading controls.
可在控制台查看账户状态、Leader 活动、未平仓指标、全局设置、Telegram 推送和跟单启停。

Set `DASHBOARD_TOKEN` before exposing the API outside localhost.
如果要在 localhost 之外访问 API，请先设置 `DASHBOARD_TOKEN`。

---

## Live Trading / 实盘交易

Live mode is intentionally gated. Do not enable it until Preview mode has been
stable and the wallet, approvals, proxy network, Telegram alerts, and kill switch
have all been verified.

实盘模式被有意加了确认门槛。请先让 Preview 稳定运行，并确认钱包、授权、代理网络、
Telegram 告警和熔断设置都正常。

Recommended Live checklist / 建议实盘检查：

1. Complete [Preview checklist / 预览检查清单](docs/PREVIEW_CHECKLIST.md).
2. Use a dedicated low-balance wallet / 使用低余额专用钱包。
3. Set `POLYSYNC_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING`.
4. Change `preview_mode: false` in `config.yaml`.
5. Restart PolySync and verify the first small orders manually / 重启后先人工核对第一批小额订单。

---

## Scripts / 常用脚本

```bash
npm run dev              # run locally / 本地运行引擎
npm run dev:dashboard    # dashboard dev server / 控制台开发服务器
npm run build            # build TypeScript + dashboard / 构建后端和控制台
npm run lint             # typecheck / 类型检查
npm test                 # test suite / 测试套件
npm run audit            # critical-level npm audit / critical 级别依赖审计
npm run docker:build     # build Docker image / 构建 Docker 镜像
```

---

## Project Layout / 项目结构

```text
src/                    Core engine, config, API, execution, notifications
dashboard/              Local dashboard UI
docs/                   User guide, runbook, security notes, architecture
scripts/                Utility and manual operation scripts
data/                   Runtime SQLite data (not committed)
config.example.yaml     General config template
config.preview.template.yaml
.env.example            Environment variable template
```

---

## Documentation / 文档

- [User guide / 用户指南](docs/USER_GUIDE.md)
- [Runbook / 运行手册](docs/RUNBOOK.md)
- [Preview checklist / 预览检查清单](docs/PREVIEW_CHECKLIST.md)
- [Security notes / 安全说明](docs/SECURITY.md)
- [Architecture / 架构](docs/ARCHITECTURE.md)
- [Ecosystem workflow / 生态工作流](docs/ECOSYSTEM_WORKFLOW.md)
- [Web Agent architecture / Web Agent 架构](docs/WEB_AGENT_ARCHITECTURE.md)
- [Marketing pitch / 推广讲稿](docs/MARKETING_PITCH_10MIN.md)
- [Dashboard overview / 控制台概览](docs/dashboard/01-overview.md)
- [Changelog / 更新记录](CHANGELOG.md)

---

## Security / 安全

- Keep `.env`, `config.yaml`, wallet keys, and SQLite data out of Git.
- Do not expose the dashboard or API without `DASHBOARD_TOKEN`.
- Prefer a dedicated low-balance wallet for Live mode.
- Start with `preview_mode: true`; only switch to Live after the checklist passes.
- Treat Telegram credentials as secrets.

- 不要把 `.env`、`config.yaml`、钱包私钥和 SQLite 数据提交到 Git。
- 对外暴露 Dashboard 或 API 前必须设置 `DASHBOARD_TOKEN`。
- 实盘建议使用低余额专用钱包。
- 首次运行保持 `preview_mode: true`，检查通过后再切换实盘。
- Telegram 凭证也应按密钥管理。

---

## License / 许可证

MIT. PolySync is based on the original
[PolyMirror](https://github.com/laoshalab/polymirror) project and keeps the MIT
license notice.

MIT。PolySync 基于原始
[PolyMirror](https://github.com/laoshalab/polymirror) 项目重构，并保留 MIT
许可证声明。
