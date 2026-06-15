// Simples In-Memory-Rate-Limit (pro Serverless-Instanz).
// Reicht gegen einfaches Abuse/Brute-Force; für harte Garantien wäre
// ein zentraler Store (Upstash/Redis) nötig.
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  b.count++
  return b.count > max
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
}
