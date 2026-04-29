const BEEPER_API_PORT = 23373
const BEEPER_INFO_PATH = "/v1/info"
const PROBE_TIMEOUT_MS = 900
const MAX_CONCURRENT_PROBES = 24

export interface BeeperDiscoveryProgress {
  scanned: number
  total: number
  currentHost?: string
}

export interface BeeperDiscoveryResult {
  baseUrl: string
  host: string
}

interface ProbeTarget {
  host: string
  priority: number
}

function isIpv4Address(host: string): boolean {
  const parts = host.split(".")
  if (parts.length !== 4) return false

  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false
    const value = Number(part)
    return value >= 0 && value <= 255
  })
}

function isPrivateIpv4Address(host: string): boolean {
  if (!isIpv4Address(host)) return false

  const [first, second] = host.split(".").map(Number)
  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  )
}

function getHostnameFromUrl(value?: string | null): string | null {
  if (!value) return null

  try {
    return new URL(value).hostname.replace(/^\[|\]$/g, "").toLowerCase()
  } catch {
    return null
  }
}

function addSubnet(targets: ProbeTarget[], prefix: string, priority: number) {
  for (let lastOctet = 1; lastOctet <= 254; lastOctet += 1) {
    targets.push({ host: `${prefix}.${lastOctet}`, priority })
  }
}

function addHost(targets: ProbeTarget[], host: string | null, priority: number) {
  if (!host || host === "0.0.0.0") return
  targets.push({ host, priority })
}

function buildProbeTargets(seedBaseUrl?: string | null): ProbeTarget[] {
  const targets: ProbeTarget[] = []
  const pageHost = window.location.hostname.replace(/^\[|\]$/g, "").toLowerCase()
  const seedHost = getHostnameFromUrl(seedBaseUrl)

  addHost(targets, seedHost, 0)
  addHost(targets, pageHost, 1)
  addHost(targets, "localhost", 2)
  addHost(targets, "127.0.0.1", 3)

  const subnetSeeds = [seedHost, pageHost].filter(
    (host): host is string => !!host && isPrivateIpv4Address(host),
  )

  subnetSeeds.forEach((host, index) => {
    const prefix = host.split(".").slice(0, 3).join(".")
    addSubnet(targets, prefix, 10 + index)
  })

  addSubnet(targets, "192.168.1", 30)
  addSubnet(targets, "192.168.0", 31)
  addSubnet(targets, "10.0.0", 32)
  addSubnet(targets, "10.0.1", 33)

  const seen = new Set<string>()
  return targets
    .sort((a, b) => a.priority - b.priority)
    .filter((target) => {
      if (seen.has(target.host)) return false
      seen.add(target.host)
      return true
    })
}

async function probeBeeperHost(host: string): Promise<BeeperDiscoveryResult | null> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
  const baseUrl = `http://${host}:${BEEPER_API_PORT}`
  const originalFetch = (window as Window & {
    __evenMessagesOriginalFetch__?: typeof window.fetch
  }).__evenMessagesOriginalFetch__
  const fetcher = originalFetch || window.fetch

  try {
    const response = await fetcher(`${baseUrl}${BEEPER_INFO_PATH}`, {
      cache: "no-store",
      signal: controller.signal,
    })

    // A 401/403 still proves that something Beeper-like is answering on the
    // expected API route. Success is preferred, but auth is not required to find
    // the computer.
    if (response.ok || response.status === 401 || response.status === 403) {
      return { baseUrl, host }
    }
  } catch {
    return null
  } finally {
    window.clearTimeout(timeoutId)
  }

  return null
}

export async function findBeeperDesktop(
  seedBaseUrl?: string | null,
  onProgress?: (progress: BeeperDiscoveryProgress) => void,
): Promise<BeeperDiscoveryResult | null> {
  const targets = buildProbeTargets(seedBaseUrl)
  let scanned = 0
  let nextIndex = 0
  let found: BeeperDiscoveryResult | null = null

  async function worker() {
    while (!found && nextIndex < targets.length) {
      const target = targets[nextIndex]
      nextIndex += 1
      onProgress?.({ scanned, total: targets.length, currentHost: target.host })

      const result = await probeBeeperHost(target.host)
      scanned += 1
      onProgress?.({ scanned, total: targets.length, currentHost: target.host })

      if (result) {
        found = result
        return
      }
    }
  }

  const workerCount = Math.min(MAX_CONCURRENT_PROBES, targets.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return found
}
