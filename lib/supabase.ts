const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TABLE = 'ghl_cache'

interface CacheRow {
  cache_key: string
  data: any
  expires_at: string
  created_at: string
}

export async function getCacheEntry<T = any>(key: string): Promise<T | null> {
  const now = new Date().toISOString()
  const url = `${SUPABASE_URL}/rest/v1/${TABLE}?cache_key=eq.${encodeURIComponent(key)}&expires_at=gt.${encodeURIComponent(now)}&select=data`
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    cache: 'no-store',
  })
  const rows: CacheRow[] = await res.json()
  if (!Array.isArray(rows) || rows.length === 0) return null
  return rows[0].data as T
}

export async function setCacheEntry(key: string, data: any, ttlHours = 24): Promise<void> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000).toISOString()

  const url = `${SUPABASE_URL}/rest/v1/${TABLE}`
  await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      cache_key: key,
      data,
      expires_at: expiresAt,
      created_at: now.toISOString(),
    }),
    cache: 'no-store',
  })
}
