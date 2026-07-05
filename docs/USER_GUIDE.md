# PolySync 使用指南

PolySync 是一个自托管的 Polymarket 跟单引擎。它会监听一个或多个 Leader
钱包，根据你的策略缩放订单，并在统一风控后以 Preview 或 Live 模式执行。

默认建议先用 Preview。Preview 只写本地记录，不会真实下单。

## 1. 安装

```bash
git clone https://github.com/bq328/PolySync.git PolySync
cd PolySync
npm install
cp .env.example .env
cp config.preview.template.yaml config.yaml
```

Node.js 建议使用项目支持的版本；如果依赖提示 Polymarket SDK 推荐更高 Node
版本，发布前再统一升级运行环境。

## 2. 配置 `.env`

最少需要：

```bash
POLYMARKET_PRIVATE_KEY=<64位hex私钥>
POLYMARKET_ADDRESS=<0x proxy地址>
```

如果 `POLYMARKET_ADDRESS` 与私钥推导出的 EOA 不一致，通常需要：

```bash
POLYMARKET_SIGNATURE_TYPE=1
```

Dashboard 需要登录时设置：

```bash
DASHBOARD_TOKEN=<足够长的随机字符串>
```

Live 模式必须显式确认：

```bash
POLYSYNC_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING
```

兼容说明：旧变量 `POLYMIRROR_LIVE_CONFIRM`、`POLYMIRROR_DB_PATH` 仍可用，
但新部署应使用 `POLYSYNC_*`。

## 3. 配置 `config.yaml`

关键字段：

```yaml
global:
  preview_mode: true
  poll_interval_ms: 5000
  max_trade_age_hours: 1
  risk:
    enable_copy_trading: true
    max_order_usd: 25
    max_daily_volume_usd: 500

leaders:
  - id: leader_main
    address: "0x..."
    enabled: true
    strategy:
      type: PERCENTAGE
      copy_size: 10
```

也可以用 Polymarket 用户名：

```yaml
leaders:
  - id: trader_a
    username: "polymarket-handle"
    enabled: true
    strategy:
      type: PERCENTAGE
      copy_size: 5
```

地址方式启动更快；用户名方式会在启动时请求 Gamma API 解析 proxy wallet。

## 4. Preview 运行

```bash
npm run dev
```

看到类似日志表示已进入 Preview：

```text
[polysync] ... "preview": true
[polysync] PREVIEW would copy: ...
```

健康检查：

```bash
curl -s http://127.0.0.1:8080/health
```

Dashboard：

```text
http://127.0.0.1:8080/
```

## 5. Live 运行

只在完成 Preview 检查后切换：

1. 使用专用低余额钱包。
2. 设置 `POLYSYNC_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING`。
3. 将 `config.yaml` 的 `preview_mode` 改为 `false`。
4. 重启 PolySync。
5. 在 Polymarket UI 手动核对第一笔订单。

如果没有设置确认变量，PolySync 会拒绝 Live。

## 6. Docker

```bash
cp .env.example .env
cp config.example.yaml config.yaml
docker compose up -d --build
docker compose logs -f
```

Docker Compose 会把 `HEALTH_BIND` 设置为 `0.0.0.0` 以便端口映射。公网访问时
务必设置 `DASHBOARD_TOKEN`。

## 7. 状态文件

默认数据库路径为了兼容仍保留：

| 模式 | 默认路径 |
|------|----------|
| Preview | `data/preview.db` |
| Live | `data/polymirror.db` |
| 多账户 | `data/accounts/<account-id>/...` |

自定义路径：

```bash
POLYSYNC_DB_PATH=data/custom.db
```

## 8. 常见问题

| 问题 | 处理 |
|------|------|
| 没有跟单 | 检查 leader 是否 enabled、是否有近期成交、过滤器是否太严格 |
| Live 被拒绝 | 检查 `POLYSYNC_LIVE_CONFIRM` 和 `preview_mode: false` |
| Dashboard 无法登录 | 检查 `.env` 中的 `DASHBOARD_TOKEN` |
| 用户名解析失败 | 改用 proxy wallet 地址 |
| 订单被拒 | 检查余额、授权、tick size、最小订单金额 |

## 9. 安全原则

- 不提交 `.env`、`config.yaml`、私钥、API token、数据库文件。
- Live 使用专用低余额钱包。
- 先 Preview，再 Live。
- 不从不可信 copy-bot 仓库复制依赖或脚本。
