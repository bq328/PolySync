# PolySync

**PolySync** is a self-hosted Polymarket trade sync engine. It watches one or
more leader wallets, scales matching trades with per-leader rules, and applies
shared risk controls before previewing or placing orders.

[![CI](https://github.com/bq328/PolySync/actions/workflows/ci.yml/badge.svg)](https://github.com/bq328/PolySync/actions/workflows/ci.yml)

## 中文说明 / Chinese Overview

PolySync 是一个自托管的 Polymarket 跟单同步工具，用于监听一个或多个
Leader 钱包，并按你设置的比例、固定金额、过滤条件和风险上限来预览或执行跟单。

PolySync is a self-hosted Polymarket trade sync tool. It watches one or more
leader wallets, then previews or places copied trades according to your sizing
rules, filters, and risk limits.

项目默认以 **Preview 预览模式** 运行，不会真实下单。首次使用建议先完成：

The project starts in **Preview mode** by default and does not place real orders.
Recommended first-run steps:

1. 复制 `.env.example` 为 `.env`，填写钱包、Dashboard Token、Telegram 凭证等本地配置。
   Copy `.env.example` to `.env`, then fill in wallet, Dashboard token, and Telegram settings.
2. 复制 `config.preview.template.yaml` 为 `config.yaml`，配置 Leader、仓位比例、过滤条件和风险限制。
   Copy `config.preview.template.yaml` to `config.yaml`, then configure leaders, sizing, filters, and risk limits.
3. 运行 `npm run dev`，打开 Dashboard 检查账户、Leader、活动记录和通知设置。
   Run `npm run dev`, then open the Dashboard to check accounts, leaders, activity, and notifications.
4. 点击 Telegram 的“发送测试消息”，确认机器人能正常推送。
   Click Telegram "Send test message" to confirm bot delivery works.
5. Preview 跑通并确认风控后，再考虑开启实盘模式。
   Only consider Live mode after Preview and risk controls behave as expected.

实盘交易需要显式设置 `POLYSYNC_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING`
并把 `config.yaml` 里的 `preview_mode` 改为 `false`。请使用低余额专用钱包，
先小额测试，确认余额、授权、代理网络、Telegram 告警和熔断设置都正常后再扩大规模。

Live trading requires setting `POLYSYNC_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING`
and changing `preview_mode` to `false` in `config.yaml`. Use a dedicated
low-balance wallet, test with tiny size first, and confirm balance, approvals,
proxy networking, Telegram alerts, and kill switch behavior before scaling up.

## What It Does / 功能概览

| Area / 模块 | Summary / 说明 |
|------|---------|
| Leaders / 跟单对象 | Track proxy wallet addresses or resolve Polymarket usernames / 跟踪钱包地址或解析用户名 |
| Sizing / 仓位 | `PERCENTAGE`, `FIXED`, `ADAPTIVE`, and tiered multipliers / 支持比例、固定金额、自适应和分层倍率 |
| Risk / 风控 | Daily volume caps, max order size, max markets, slippage, kill switch / 日交易额、单笔上限、市场数量、滑点和熔断 |
| Modes / 模式 | Preview by default; Live requires explicit confirmation / 默认预览，实盘需显式确认 |
| Dashboard / 控制台 | Local web UI on the same port as `/health` / 本地 Web 控制台与健康检查共用端口 |
| Storage / 存储 | SQLite state under `data/` / SQLite 状态数据保存在 `data/` |

## Quick Start / 快速开始

```bash
git clone https://github.com/bq328/PolySync.git PolySync
cd PolySync
npm install
cp .env.example .env
cp config.preview.template.yaml config.yaml
npm run dev
```

Before running live, edit / 开启实盘前请先编辑：

- `.env`: wallet, optional Telegram, optional Dashboard token / 钱包、可选 Telegram、可选 Dashboard Token
- `config.yaml`: leaders, sizing, filters, risk limits / Leader、仓位、过滤条件和风控限制

Preview mode is enabled in the template and does not place real orders.
模板默认启用 Preview 预览模式，不会真实下单。

## Dashboard / 控制台

When `health_port` is enabled, open / 启用 `health_port` 后打开：

```text
http://127.0.0.1:8080/
```

Use `DASHBOARD_TOKEN` in `.env` before exposing the API outside localhost.
如果要在 localhost 之外访问 API，请先在 `.env` 设置 `DASHBOARD_TOKEN`。

## Docker / 容器运行

```bash
cp .env.example .env
cp config.example.yaml config.yaml
docker compose up -d --build
docker compose logs -f
```

Manual image build / 手动构建镜像：

```bash
docker build -t polysync:1.0.0 .
```

## Live Trading / 实盘交易

Live mode is intentionally gated. Use a dedicated low-balance wallet, complete a
preview run first, then set:

实盘模式被有意加了确认门槛。请使用低余额专用钱包，先完成 Preview 预览运行，再设置：

```bash
POLYSYNC_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING
```

Then set `preview_mode: false` in `config.yaml` and restart. Legacy
`POLYMIRROR_LIVE_CONFIRM` and `POLYMIRROR_DB_PATH` are still accepted for
upgrades, but new deployments should use `POLYSYNC_*`.

然后把 `config.yaml` 里的 `preview_mode` 改为 `false` 并重启。旧的
`POLYMIRROR_LIVE_CONFIRM` 和 `POLYMIRROR_DB_PATH` 仍兼容升级场景，
新部署建议统一使用 `POLYSYNC_*`。

## Common Commands / 常用命令

```bash
npm run dev              # run locally / 本地运行引擎
npm run dev:dashboard    # dashboard dev server / 控制台开发服务器
npm run build            # build TypeScript + dashboard / 构建后端和控制台
npm run lint             # typecheck / 类型检查
npm test                 # test suite / 测试套件
npm run audit            # critical-level npm audit / critical 级别依赖审计
```

## Important Files / 重要文件

| Path / 路径 | Purpose / 用途 | Commit? / 提交到 Git? |
|------|---------|---------|
| `.env` | Secrets and local runtime options / 密钥和本地运行配置 | No / 否 |
| `config.yaml` | Leaders, modes, risk and execution config / Leader、模式、风控和执行配置 | No / 否 |
| `config.example.yaml` | General template / 通用模板 | Yes / 是 |
| `config.preview.template.yaml` | Safer preview-first template / 更安全的预览优先模板 | Yes / 是 |
| `data/` | SQLite state / SQLite 状态数据 | No / 否 |

## Documentation / 文档

- [User guide / 用户指南](docs/USER_GUIDE.md)
- [Runbook / 运行手册](docs/RUNBOOK.md)
- [Preview checklist / 预览检查清单](docs/PREVIEW_CHECKLIST.md)
- [Security notes / 安全说明](docs/SECURITY.md)
- [Architecture / 架构](docs/ARCHITECTURE.md)
- [Changelog / 更新记录](CHANGELOG.md)

## License

MIT. PolySync is based on the original PolyMirror project and keeps the MIT
license notice.
