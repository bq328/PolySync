import { describe, expect, it } from "vitest";
import { assertLiveTradingAllowed, assertLiveTradingForAccounts } from "../src/engine/risk.js";
import { patchGlobalSettings } from "../src/api/settings.js";
import type { ApiContext } from "../src/api/routes.js";
import type { AccountApiContext } from "../src/accounts/manager.js";
import { globalSettingsPatchSchema } from "../src/config/settings-schema.js";
import { globalYamlSchema } from "../src/config/document.js";

describe("assertLiveTradingAllowed", () => {
  function withLiveEnv(
    values: {
      polysync?: string;
      polymirror?: string;
      require?: string;
    },
    fn: () => void | Promise<void>
  ) {
    const prevPolysync = process.env.POLYSYNC_LIVE_CONFIRM;
    const prevPolymirror = process.env.POLYMIRROR_LIVE_CONFIRM;
    const prevRequire = process.env.REQUIRE_LIVE_CONFIRM;
    if (values.polysync === undefined) delete process.env.POLYSYNC_LIVE_CONFIRM;
    else process.env.POLYSYNC_LIVE_CONFIRM = values.polysync;
    if (values.polymirror === undefined) delete process.env.POLYMIRROR_LIVE_CONFIRM;
    else process.env.POLYMIRROR_LIVE_CONFIRM = values.polymirror;
    if (values.require === undefined) delete process.env.REQUIRE_LIVE_CONFIRM;
    else process.env.REQUIRE_LIVE_CONFIRM = values.require;
    const restore = () => {
      if (prevPolysync !== undefined) process.env.POLYSYNC_LIVE_CONFIRM = prevPolysync;
      else delete process.env.POLYSYNC_LIVE_CONFIRM;
      if (prevPolymirror !== undefined) process.env.POLYMIRROR_LIVE_CONFIRM = prevPolymirror;
      else delete process.env.POLYMIRROR_LIVE_CONFIRM;
      if (prevRequire !== undefined) process.env.REQUIRE_LIVE_CONFIRM = prevRequire;
      else delete process.env.REQUIRE_LIVE_CONFIRM;
    };
    try {
      const result = fn();
      if (result instanceof Promise) return result.finally(restore);
      restore();
      return result;
    } catch (e) {
      restore();
      throw e;
    }
  }

  it("allows preview mode without confirm env", () => {
    expect(() => assertLiveTradingAllowed(true)).not.toThrow();
  });

  it("blocks live trading without POLYSYNC_LIVE_CONFIRM", () => {
    withLiveEnv({ require: "true" }, () => {
      expect(() => assertLiveTradingAllowed(false)).toThrow(/I_UNDERSTAND_LIVE_TRADING/);
    });
  });

  it("allows live when POLYSYNC_LIVE_CONFIRM is set", () => {
    withLiveEnv({ polysync: "I_UNDERSTAND_LIVE_TRADING", require: "true" }, () => {
      expect(() => assertLiveTradingAllowed(false)).not.toThrow();
    });
  });

  it("keeps POLYMIRROR_LIVE_CONFIRM as a compatibility fallback", () => {
    withLiveEnv({ polymirror: "I_UNDERSTAND_LIVE_TRADING", require: "true" }, () => {
      expect(() => assertLiveTradingAllowed(false)).not.toThrow();
    });
  });

  it("prefers POLYSYNC_LIVE_CONFIRM over the compatibility fallback", () => {
    withLiveEnv(
      {
        polysync: "nope",
        polymirror: "I_UNDERSTAND_LIVE_TRADING",
        require: "true",
      },
      () => {
        expect(() => assertLiveTradingAllowed(false)).toThrow(/I_UNDERSTAND_LIVE_TRADING/);
      }
    );
  });
});

describe("assertLiveTradingForAccounts", () => {
  it("blocks when any account is live without confirm", () => {
    const prevPolysync = process.env.POLYSYNC_LIVE_CONFIRM;
    const prevPolymirror = process.env.POLYMIRROR_LIVE_CONFIRM;
    const prevRequire = process.env.REQUIRE_LIVE_CONFIRM;
    delete process.env.POLYSYNC_LIVE_CONFIRM;
    delete process.env.POLYMIRROR_LIVE_CONFIRM;
    process.env.REQUIRE_LIVE_CONFIRM = "true";
    try {
      expect(() =>
        assertLiveTradingForAccounts([
          { config: { app: { global: { previewMode: true } } } },
          { config: { app: { global: { previewMode: false } } } },
        ])
      ).toThrow(/I_UNDERSTAND_LIVE_TRADING/);
    } finally {
      if (prevPolysync !== undefined) process.env.POLYSYNC_LIVE_CONFIRM = prevPolysync;
      else delete process.env.POLYSYNC_LIVE_CONFIRM;
      if (prevPolymirror !== undefined) process.env.POLYMIRROR_LIVE_CONFIRM = prevPolymirror;
      else delete process.env.POLYMIRROR_LIVE_CONFIRM;
      if (prevRequire !== undefined) process.env.REQUIRE_LIVE_CONFIRM = prevRequire;
      else delete process.env.REQUIRE_LIVE_CONFIRM;
    }
  });
});

describe("patchGlobalSettings live gate", () => {
  const mockRoot = {
    configPath: "/tmp/unused-config.yaml",
    reloadConfig: async () => {},
    manager: {
      buildAccountsSummary: () => [],
      list: () => [],
    },
  } as unknown as ApiContext;

  const mockActx = {
    accountId: "main",
  } as AccountApiContext;

  it("rejects previewMode:false without live confirm", async () => {
    const prevPolysync = process.env.POLYSYNC_LIVE_CONFIRM;
    const prevPolymirror = process.env.POLYMIRROR_LIVE_CONFIRM;
    const prevRequire = process.env.REQUIRE_LIVE_CONFIRM;
    delete process.env.POLYSYNC_LIVE_CONFIRM;
    delete process.env.POLYMIRROR_LIVE_CONFIRM;
    process.env.REQUIRE_LIVE_CONFIRM = "true";
    try {
      const result = await patchGlobalSettings(mockRoot, mockActx, { previewMode: false });
      expect(result.status).toBe(400);
      expect(String((result.body as { error?: string }).error)).toMatch(/I_UNDERSTAND_LIVE_TRADING/);
    } finally {
      if (prevPolysync !== undefined) process.env.POLYSYNC_LIVE_CONFIRM = prevPolysync;
      else delete process.env.POLYSYNC_LIVE_CONFIRM;
      if (prevPolymirror !== undefined) process.env.POLYMIRROR_LIVE_CONFIRM = prevPolymirror;
      else delete process.env.POLYMIRROR_LIVE_CONFIRM;
      if (prevRequire !== undefined) process.env.REQUIRE_LIVE_CONFIRM = prevRequire;
      else delete process.env.REQUIRE_LIVE_CONFIRM;
    }
  });
});

describe("activity_limit bounds", () => {
  const yamlGlobal = (activityLimit: number) => ({
    activity_limit: activityLimit,
    risk: {
      enable_copy_trading: true,
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
  });

  it("allows activity_limit up to 10000", () => {
    expect(globalYamlSchema.parse(yamlGlobal(10000)).activity_limit).toBe(10000);
    expect(globalSettingsPatchSchema.parse({ activityLimit: 10000 }).activityLimit).toBe(10000);
  });

  it("rejects activity_limit above 10000", () => {
    expect(() => globalYamlSchema.parse(yamlGlobal(10001))).toThrow();
    expect(() => globalSettingsPatchSchema.parse({ activityLimit: 10001 })).toThrow();
  });
});
