export function ipToLong(ip: string): number {
  const parts = ip.split(".");
  if (parts.length !== 4) {
    return 0;
  }
  return (
    ((parseInt(parts[0], 10) << 24) |
      (parseInt(parts[1], 10) << 16) |
      (parseInt(parts[2], 10) << 8) |
      parseInt(parts[3], 10)) >>>
    0
  );
}

export function cidrToRange(cidr: string): { start: number; end: number } {
  const [ip, prefixStr] = cidr.split("/");
  const prefix = parseInt(prefixStr, 10);
  const ipLong = ipToLong(ip);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const start = (ipLong & mask) >>> 0;
  const end = (start | (~mask >>> 0)) >>> 0;
  return { start, end };
}

export function isIpInCidr(ip: string, cidr: string): boolean {
  const ipLong = ipToLong(ip);
  const range = cidrToRange(cidr);
  return ipLong >= range.start && ipLong <= range.end;
}

export function isIpInAnyCidr(ip: string, cidrs: string[]): boolean {
  const ipLong = ipToLong(ip);
  for (const cidr of cidrs) {
    const range = cidrToRange(cidr);
    if (ipLong >= range.start && ipLong <= range.end) {
      return true;
    }
  }
  return false;
}

let cachedRanges: Array<{ cidr: string; start: number; end: number }> | null = null;

export function buildCidrCache(cidrs: string[]): void {
  cachedRanges = cidrs.map((cidr) => {
    const range = cidrToRange(cidr);
    return { cidr, ...range };
  });
}

export function isIpInCachedCidrs(ip: string): boolean {
  if (!cachedRanges) {
    return false;
  }
  const ipLong = ipToLong(ip);
  for (const range of cachedRanges) {
    if (ipLong >= range.start && ipLong <= range.end) {
      return true;
    }
  }
  return false;
}
