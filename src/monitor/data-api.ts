import { fetchJsonWithRetry } from "../util/fetch.js";

export type ActivityType =
  | "TRADE"
  | "SPLIT"
  | "MERGE"
  | "REDEEM"
  | "REWARD"
  | "CONVERSION"
  | "MAKER_REBATE";

export interface Activity {
  proxyWallet?: string;
  timestamp: number;
  conditionId?: string;
  type: ActivityType;
  size?: number;
  usdcSize?: number;
  transactionHash?: string;
  price?: number;
  asset?: string;
  side?: "BUY" | "SELL";
  outcomeIndex?: number;
  title?: string;
  slug?: string;
  eventSlug?: string;
  outcome?: string;
}

export interface GetActivityParams {
  baseUrl?: string;
  user: string;
  limit?: number;
  offset?: number;
  type?: ActivityType;
  sortBy?: "TIMESTAMP" | "TOKENS" | "CASH";
  sortDirection?: "ASC" | "DESC";
}

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function mapActivity(raw: Record<string, unknown>): Activity {
  const base: Activity = {
    proxyWallet: str(raw.wallet),
    timestamp: num(raw.timestamp),
    transactionHash: str(raw.transactionHash) ?? str(raw.transaction_hash),
    type: String(raw.type ?? "") as ActivityType,
  };

  if (base.type !== "TRADE") return base;
  return {
    ...base,
    size: num(raw.shares ?? raw.size),
    usdcSize: num(raw.amount ?? raw.usdcSize ?? raw.usdc_size),
    price: num(raw.price),
    asset: str(raw.asset) ?? str(raw.tokenId) ?? str(raw.token_id),
    side: String(raw.side ?? "") as "BUY" | "SELL",
    conditionId: str(raw.conditionId) ?? str(raw.condition_id),
    outcomeIndex:
      typeof raw.outcomeIndex === "number"
        ? raw.outcomeIndex
        : typeof raw.outcome_index === "number"
          ? raw.outcome_index
          : undefined,
    title: str(raw.title),
    slug: str(raw.slug),
    eventSlug: str(raw.eventSlug) ?? str(raw.event_slug),
    outcome: str(raw.outcome),
  };
}

export function buildActivityUrl(base: string, params: GetActivityParams): string {
  const root = (base || "https://data-api.polymarket.com").replace(/\/$/, "");
  const url = new URL(`${root}/activity`);
  url.searchParams.set("user", params.user);
  if (params.type) url.searchParams.set("type", params.type);
  if (params.sortBy) url.searchParams.set("sortBy", params.sortBy);
  if (params.sortDirection) url.searchParams.set("sortDirection", params.sortDirection);
  url.searchParams.set("limit", String(Math.min(500, params.limit ?? 100)));
  url.searchParams.set("offset", String(params.offset ?? 0));
  return url.toString();
}

function isRetryableActivityError(e: Error): boolean {
  if (e.name === "TimeoutError") return true;
  return /timed out|fetch failed|transport/i.test(e.message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchActivityPage(params: GetActivityParams): Promise<Activity[]> {
  const url = buildActivityUrl(params.baseUrl ?? "", params);
  const rows = await fetchJsonWithRetry<unknown>(url, { timeoutMs: 15_000 });
  if (!Array.isArray(rows)) {
    throw new Error(`Unexpected Data API response: ${url}`);
  }
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object")
    .map(mapActivity);
}

export async function getActivity(
  base: string,
  params: GetActivityParams,
  networkRetryLimit = 0
): Promise<Activity[]> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= networkRetryLimit; attempt++) {
    try {
      return await fetchActivityPage({ ...params, baseUrl: base });
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < networkRetryLimit && isRetryableActivityError(lastError)) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new Error("getActivity failed");
}

export function tradeEventKey(a: Activity): string {
  const tx = a.transactionHash ?? "";
  const asset = a.asset ?? "";
  const side = a.side ?? "";
  const ts = a.timestamp ?? 0;
  if (tx) return `${tx}:${asset}:${side}`;
  return `:${ts}:${asset}:${side}`;
}
