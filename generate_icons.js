const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Function to create an uncompressed PNG buffer
function createPng(size, primaryHex, secondaryHex) {
  // Parsing hex colors
  const r1 = parseInt(primaryHex.slice(1, 3), 16);
  const g1 = parseInt(primaryHex.slice(3, 5), 16);
  const b1 = parseInt(primaryHex.slice(5, 7), 16);

  const r2 = parseInt(secondaryHex.slice(1, 3), 16);
  const g2 = parseInt(secondaryHex.slice(3, 5), 16);
  const b2 = parseInt(secondaryHex.slice(5, 7), 16);

  const rawData = Buffer.alloc(size * (size * 4 + 1));
  let offset = 0;

  for (let y = 0; y < size; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < size; x++) {
      const cx = size / 2;
      const cy = size / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = size * 0.44;

      // Dark background with gradient rounded square or circle
      const isCorner = (x < size*0.1 || x > size*0.9) && (y < size*0.1 || y > size*0.9);
      
      if (dist < radius) {
        // Gradient from cyan to purple with 3D cube motif in center
        const t = (x + y) / (size * 2);
        const r = Math.round(r1 * (1 - t) + r2 * t);
        const g = Math.round(g1 * (1 - t) + g2 * t);
        const b = Math.round(b1 * (1 - t) + b2 * t);

        // Center cube outline
        const relX = (x - cx) / radius;
        const relY = (y - cy) / radius;
        const inInnerCube = Math.abs(relX) < 0.4 && Math.abs(relY) < 0.4;
        const isBorder = Math.abs(relX) > 0.35 || Math.abs(relY) > 0.35;

        if (inInnerCube && isBorder) {
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
        } else {
          rawData[offset++] = r;
          rawData[offset++] = g;
          rawData[offset++] = b;
          rawData[offset++] = 255;
        }
      } else {
        // Dark theme background #0a0d14
        rawData[offset++] = 10;
        rawData[offset++] = 13;
        rawData[offset++] = 20;
        rawData[offset++] = 255;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter method
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);

  const crcBuf = buf.subarray(4, 8 + len);
  const crc = crc32(crcBuf);
  buf.writeUInt32BE(crc >>> 0, 8 + len);
  return buf;
}

// Simple CRC32 implementation
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc = crc ^ byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

const icon192 = createPng(192, '#00f2fe', '#7928ca');
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192);

const icon512 = createPng(512, '#00f2fe', '#7928ca');
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512);

console.log('Icons generated successfully!');
