export function readEnv(primary: string, fallback?: string): string | undefined {
  const primaryValue = process.env[primary]?.trim();
  if (primaryValue) return primaryValue;
  if (!fallback) return undefined;
  const fallbackValue = process.env[fallback]?.trim();
  return fallbackValue || undefined;
}

export function liveConfirmEnvName(): string {
  return "POLYSYNC_LIVE_CONFIRM";
}

export function dbPathEnvName(): string {
  return "POLYSYNC_DB_PATH";
}

export function readLiveConfirm(): string {
  return readEnv(liveConfirmEnvName(), "POLYMIRROR_LIVE_CONFIRM") ?? "";
}

export function readDbPathOverride(): string {
  return readEnv(dbPathEnvName(), "POLYMIRROR_DB_PATH") ?? "";
}
