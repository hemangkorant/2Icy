// One-off placeholder PWA icon generator (no image dependencies). Produces
// simple solid-background icons with a centered lighter disc so the app is
// installable immediately; swap these for real branded artwork later.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([typeBuf, data])
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([lenBuf, body, crcBuf])
}

function makePng(size, { bg, fg }, maskable = false) {
  const raw = Buffer.alloc(size * size * 4 + size) // +size for filter byte per row
  const cx = size / 2
  const cy = size / 2
  const r = maskable ? size * 0.32 : size * 0.36
  let offset = 0
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0 // filter type: none
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const inCircle = dx * dx + dy * dy <= r * r
      const color = inCircle ? fg : bg
      raw[offset++] = color[0]
      raw[offset++] = color[1]
      raw[offset++] = color[2]
      raw[offset++] = 255
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const idat = deflateSync(raw)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const NAVY = [15, 23, 42] // #0f172a
const ICE_BLUE = [147, 197, 253] // #93c5fd

mkdirSync('public/icons', { recursive: true })
writeFileSync('public/icons/icon-192.png', makePng(192, { bg: NAVY, fg: ICE_BLUE }))
writeFileSync('public/icons/icon-512.png', makePng(512, { bg: NAVY, fg: ICE_BLUE }))
writeFileSync('public/icons/icon-512-maskable.png', makePng(512, { bg: NAVY, fg: ICE_BLUE }, true))
writeFileSync('public/apple-touch-icon.png', makePng(180, { bg: NAVY, fg: ICE_BLUE }))

console.log('Generated placeholder PWA icons in public/icons and public/apple-touch-icon.png')
