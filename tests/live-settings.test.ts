import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { stringify as stringifyYaml } from "yaml";
import { configureLiveConfirm, testLiveConnection } from "../src/api/settings.js";
import type { ApiContext } from "../src/api/routes.js";
import type { AccountApiContext } from "../src/accounts/manager.js";
import { previewRuntimeConfig } from "./helpers/fixtures.js";
import { getActivity } from "../src/monitor/data-api.js";
import { fetchGeoblockStatus } from "../src/executor/geoblock.js";
import { getSecureClient } from "../src/executor/secure-client.js";
import { fetchWalletCollateral } from "../src/executor/balance.js";

vi.mock("../src/monitor/data-api.js", async () => {
  const actual = await vi.importActual<typeof import("../src/monitor/data-api.js")>(
    "../src/monitor/data-api.js"
  );
  return { ...actual, getActivity: vi.fn() };
});

vi.mock("../src/executor/geoblock.js", () => ({
  fetchGeoblockStatus: vi.fn(),
}));

vi.mock("../src/executor/secure-client.js", () => ({
  getSecureClient: vi.fn(),
}));

vi.mock("../src/executor/balance.js", () => ({
  fetchWalletCollateral: vi.fn(),
}));

function writeTestConfig(dir: string): string {
  const path = join(dir, "config.yaml");
  writeFileSync(
    path,
    stringifyYaml({
      global: {
        preview_mode: true,
        poll_interval_ms: 5000,
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
      },
      leaders: [],
    }),
    "utf8"
  );
  return path;
}

function buildContexts(dir: string): { root: ApiContext; actx: AccountApiContext } {
  const configPath = writeTestConfig(dir);
  const config = previewRuntimeConfig([]);
  const actx = {
    accountId: "default",
    label: "默认账户",
    enabled: true,
    getConfig: () => config,
    dbPath: join(dir, "polysync.db"),
    configPath,
    reloadConfig: async () => {},
  } as AccountApiContext;
  const root = {
    configPath,
    configFileKey: "config.yaml",
    reloadConfig: async () => {},
    manager: {
      buildAccountsSummary: () => [],
      list: () => [],
    },
  } as unknown as ApiContext;
  return { root, actx };
}

describe("live settings controls", () => {
  let dir: string;
  let prevLive: string | undefined;
  let prevLegacyLive: string | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polysync-live-settings-"));
    prevLive = process.env.POLYSYNC_LIVE_CONFIRM;
    prevLegacyLive = process.env.POLYMIRROR_LIVE_CONFIRM;
    delete process.env.POLYSYNC_LIVE_CONFIRM;
    delete process.env.POLYMIRROR_LIVE_CONFIRM;
    vi.mocked(getActivity).mockReset();
    vi.mocked(fetchGeoblockStatus).mockReset();
    vi.mocked(getSecureClient).mockReset();
    vi.mocked(fetchWalletCollateral).mockReset();
  });

  afterEach(() => {
    if (prevLive === undefined) delete process.env.POLYSYNC_LIVE_CONFIRM;
    else process.env.POLYSYNC_LIVE_CONFIRM = prevLive;
    if (prevLegacyLive === undefined) delete process.env.POLYMIRROR_LIVE_CONFIRM;
    else process.env.POLYMIRROR_LIVE_CONFIRM = prevLegacyLive;
    rmSync(dir, { recursive: true, force: true });
  });

  it("writes the live confirmation env from settings", async () => {
    const { root, actx } = buildContexts(dir);
    const envPath = join(dir, ".env");

    const result = await configureLiveConfirm(root, actx, envPath);

    expect(result.status).toBe(200);
    expect((result.body as { ok?: boolean; key?: string }).ok).toBe(true);
    expect((result.body as { key?: string }).key).toBe("POLYSYNC_LIVE_CONFIRM");
    expect(process.env.POLYSYNC_LIVE_CONFIRM).toBe("I_UNDERSTAND_LIVE_TRADING");
    expect(readFileSync(join(dir, ".env"), "utf8")).toContain(
      "POLYSYNC_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING"
    );
  });

  it("does not touch live network checks before confirmation", async () => {
    const { actx } = buildContexts(dir);

    const result = await testLiveConnection(actx);

    expect(result.status).toBe(200);
    expect((result.body as { ok?: boolean }).ok).toBe(false);
    expect((result.body as { message?: string }).message).toMatch(/实盘确认未配置/);
    expect(getActivity).not.toHaveBeenCalled();
    expect(fetchGeoblockStatus).not.toHaveBeenCalled();
    expect(getSecureClient).not.toHaveBeenCalled();
    expect(fetchWalletCollateral).not.toHaveBeenCalled();
  });

  it("runs non-trading live connection checks after confirmation", async () => {
    const { actx } = buildContexts(dir);
    process.env.POLYSYNC_LIVE_CONFIRM = "I_UNDERSTAND_LIVE_TRADING";
    vi.mocked(getActivity).mockResolvedValue([]);
    vi.mocked(fetchGeoblockStatus).mockResolvedValue({ blocked: false, country: "US" });
    vi.mocked(getSecureClient).mockResolvedValue({
      account: { wallet: "0x" + "3".repeat(40) },
    } as Awaited<ReturnType<typeof getSecureClient>>);
    vi.mocked(fetchWalletCollateral).mockResolvedValue({
      cashUsd: 12.34,
      clobUsd: 12.34,
      clobAllowanceUsd: null,
      chainUsd: null,
      source: "clob",
      pusdAllowancesReady: null,
    });

    const result = await testLiveConnection(actx);

    expect(result.status).toBe(200);
    expect((result.body as { ok?: boolean }).ok).toBe(true);
    expect((result.body as { message?: string }).message).toMatch(/未下单/);
    expect(getActivity).toHaveBeenCalledOnce();
    expect(fetchGeoblockStatus).toHaveBeenCalledOnce();
    expect(getSecureClient).toHaveBeenCalledOnce();
    expect(fetchWalletCollateral).toHaveBeenCalledOnce();
  });
});
