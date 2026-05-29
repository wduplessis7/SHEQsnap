export interface LicenseData {
  status: 'active' | 'inactive' | 'expired' | 'error'
  modules: string[]
  expiresAt?: string
  maxUsers: number | null
  monthlyTotal: number | null
}

const TTL = 86400 * 1000 // 24h
let _cache: { data: LicenseData; ts: number } | null = null

async function fetchLicenseFromServer(): Promise<LicenseData> {
  const url = process.env.VANTECH_LICENSE_URL
  const apiKey = process.env.VANTECH_API_KEY

  if (!url || !apiKey) {
    return { status: 'active', modules: ['all'], maxUsers: null, monthlyTotal: null }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${url}/api/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, product: 'sheqsnap' }),
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!res.ok) return { status: 'error', modules: [], maxUsers: null, monthlyTotal: null }

    const data = await res.json()
    return {
      status: data.status ?? 'error',
      modules: data.modules ?? [],
      expiresAt: data.expiresAt,
      maxUsers: data.maxUsers ?? null,
      monthlyTotal: data.monthlyTotal ?? null,
    }
  } catch {
    // License server unreachable — fail open with base modules only
    return {
      status: 'active',
      modules: ['actions', 'near-misses', 'observations', 'incidents'],
      maxUsers: null,
      monthlyTotal: null,
    }
  }
}

export async function getLicenseModules(): Promise<LicenseData> {
  if (_cache && Date.now() - _cache.ts < TTL) return _cache.data
  const data = await fetchLicenseFromServer()
  _cache = { data, ts: Date.now() }
  return data
}

export function hasModule(modules: string[], slug: string): boolean {
  return modules.includes('all') || modules.includes(slug)
}
