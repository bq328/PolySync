import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { patchTelegramSettings, testTelegramSettings } from "../src/api/settings.js";

describe("Telegram settings", () => {
  let dir: string;
  let prevToken: string | undefined;
  let prevChat: string | undefined;
  let prevFetch: typeof globalThis.fetch;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "polysync-telegram-settings-"));
    prevToken = process.env.TELEGRAM_BOT_TOKEN;
    prevChat = process.env.TELEGRAM_CHAT_ID;
    prevFetch = globalThis.fetch;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  afterEach(() => {
    if (prevToken === undefined) delete process.env.TELEGRAM_BOT_TOKEN;
    else process.env.TELEGRAM_BOT_TOKEN = prevToken;
    if (prevChat === undefined) delete process.env.TELEGRAM_CHAT_ID;
    else process.env.TELEGRAM_CHAT_ID = prevChat;
    globalThis.fetch = prevFetch;
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("persists credentials and applies them to the running process", async () => {
    const envPath = join(dir, ".env");

    const result = await patchTelegramSettings(
      { botToken: "123456789:AA_test-token", chatId: "-100123456789" },
      envPath
    );

    expect(result.status).toBe(200);
    expect((result.body as { telegramConfigured?: boolean }).telegramConfigured).toBe(true);
    expect(process.env.TELEGRAM_BOT_TOKEN).toBe("123456789:AA_test-token");
    expect(process.env.TELEGRAM_CHAT_ID).toBe("-100123456789");
    const env = readFileSync(envPath, "utf8");
    expect(env).toContain("TELEGRAM_BOT_TOKEN=123456789:AA_test-token");
    expect(env).toContain("TELEGRAM_CHAT_ID=-100123456789");
  });

  it("sends a test message with current credentials", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123456789:AA_test-token";
    process.env.TELEGRAM_CHAT_ID = "-100123456789";
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await testTelegramSettings();

    expect(result.status).toBe(200);
    expect((result.body as { ok?: boolean }).ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("https://api.telegram.org/bot123456789:AA_test-token/sendMessage");
    expect(JSON.parse(String((init as RequestInit).body))).toMatchObject({
      chat_id: "-100123456789",
      disable_web_page_preview: true,
    });
  });

  it("reports missing credentials before sending a test message", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await testTelegramSettings();

    expect(result.status).toBe(200);
    expect((result.body as { ok?: boolean }).ok).toBe(false);
    expect(String((result.body as { message?: string }).message)).toMatch(/未配置/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("redacts the bot token from test-send errors", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123456789:AA_test-token";
    process.env.TELEGRAM_CHAT_ID = "-100123456789";
    globalThis.fetch = vi.fn(async () => {
      throw new Error(
        "Request timed out: https://api.telegram.org/bot123456789:AA_test-token/sendMessage"
      );
    }) as typeof fetch;

    const result = await testTelegramSettings();

    expect(result.status).toBe(200);
    expect((result.body as { ok?: boolean }).ok).toBe(false);
    expect(String((result.body as { message?: string }).message)).not.toContain(
      "123456789:AA_test-token"
    );
    expect(String((result.body as { message?: string }).message)).toContain("<redacted>");
  });
});
