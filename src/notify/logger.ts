export function logInfo(message: string, meta?: Record<string, unknown> | object): void {
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[polysync] ${message}${suffix}`);
}

export function logError(message: string, meta?: Record<string, unknown> | object): void {
  const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
  console.error(`[polysync] ERROR ${message}${suffix}`);
}

export function logPreviewAction(details: Record<string, unknown>): void {
  console.log(`[polysync] PREVIEW would copy: ${JSON.stringify(details)}`);
}
