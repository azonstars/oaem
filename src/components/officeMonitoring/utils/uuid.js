export const isUuid = (str) => {
  if (!str || typeof str !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export const toValidUuid = (str) => {
  if (!str) return '00000000-0000-4000-8000-000000000000'
  const s = String(str).trim()
  if (isUuid(s)) return s.toLowerCase()

  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)

  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0')
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0')
  const hex3 = ((h1 ^ h2) >>> 0).toString(16).padStart(8, '0')
  const hex4 = ((h1 + h2) >>> 0).toString(16).padStart(8, '0')

  const fullHex = (hex1 + hex2 + hex3 + hex4).slice(0, 32)
  return `${fullHex.slice(0, 8)}-${fullHex.slice(8, 12)}-4${fullHex.slice(13, 16)}-8${fullHex.slice(17, 20)}-${fullHex.slice(20, 32)}`.toLowerCase()
}
