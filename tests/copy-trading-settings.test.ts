import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { startCopyTrading } from "../src/api/settings.js";
import { StateStore } from "../src/state/store.js";
import type { ApiContext } from "../src/api/routes.js";
import type { AccountApiContext } from "../src/accounts/manager.js";
import { previewRuntimeConfig } from "./helpers/fixtures.js";

describe("copy trading settings", () => {
  let dir: string;
  let store: StateStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polysync-copy-settings-"));
    store = new StateStore(join(dir, "polysync.db"));
  });

  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("enables copy trading without switching out of Preview", async () => {
    const configPath = join(dir, "config.yaml");
    writeFileSync(
      configPath,
      stringifyYaml({
        global: {
          preview_mode: true,
          poll_interval_ms: 5000,
          risk: {
            enable_copy_trading: false,
            daily_loss_cap_pct: 20,
            starting_capital_usd: 500,
            max_daily_volume_usd: 500,
            max_open_markets: 15,
            max_order_usd: 25,
            min_order_usd: 1,
            slippage_tolerance: 0.03,
          },
          execution: {
            order_type: "GTC",
            retry_limit: 3,
            network_retry_limit: 3,
            gtc_fill_timeout_ms: 10_000,
            pending_order_max_age_hours: 48,
          },
          conflict: { mode: "priority_leader", priority: [] },
        },
        leaders: [],
      }),
      "utf8"
    );

    const stoppedConfig = previewRuntimeConfig([]);
    stoppedConfig.app.global.risk.enableCopyTrading = false;
    const startedConfig = previewRuntimeConfig([]);
    startedConfig.app.global.risk.enableCopyTrading = true;

    const actx = {
      accountId: "default",
      getConfig: () => stoppedConfig,
      store,
    } as AccountApiContext;
    const root = {
      configPath,
      reloadConfig: async () => {},
      manager: {
        list: () => [],
        require: () => ({ config: startedConfig }),
      },
    } as unknown as ApiContext;

    const result = await startCopyTrading(root, actx);

    expect(result.status).toBe(200);
    expect((result.body as { copyTradingEnabled?: boolean }).copyTradingEnabled).toBe(true);
    expect((result.body as { previewMode?: boolean }).previewMode).toBe(true);

    const saved = parseYaml(readFileSync(configPath, "utf8")) as {
      global?: { preview_mode?: boolean; risk?: { enable_copy_trading?: boolean } };
    };
    expect(saved.global?.preview_mode).toBe(true);
    expect(saved.global?.risk?.enable_copy_trading).toBe(true);
  });
});
