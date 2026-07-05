import { afterEach, describe, expect, it, vi } from "vitest";
import { buildActivityUrl, getActivity } from "../src/monitor/data-api.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Data API activity fetch", () => {
  it("builds a direct /activity URL with query params", () => {
    const url = buildActivityUrl("https://proxy.example/data", {
      user: "0xabc",
      type: "TRADE",
      sortBy: "TIMESTAMP",
      sortDirection: "DESC",
      limit: 101,
      offset: 0,
    });

    expect(url).toBe(
      "https://proxy.example/data/activity?user=0xabc&type=TRADE&sortBy=TIMESTAMP&sortDirection=DESC&limit=101&offset=0"
    );
  });

  it("uses the configured Data API base URL instead of the SDK activity client", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify([
          {
            type: "TRADE",
            timestamp: 1710000000,
            transactionHash: "0xtx",
            asset: "token-1",
            side: "BUY",
            shares: "10",
            amount: "5",
            price: "0.5",
          },
        ]),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const rows = await getActivity(
      "https://proxy.example/data",
      {
        user: "0xabc",
        type: "TRADE",
        sortBy: "TIMESTAMP",
        sortDirection: "DESC",
        limit: 101,
        offset: 0,
      },
      0
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]![0])).toContain("https://proxy.example/data/activity");
    expect(rows[0]).toMatchObject({
      type: "TRADE",
      transactionHash: "0xtx",
      asset: "token-1",
      side: "BUY",
      size: 10,
      usdcSize: 5,
      price: 0.5,
    });
  });
});
