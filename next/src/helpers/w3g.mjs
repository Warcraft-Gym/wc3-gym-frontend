// Read what a Warcraft III replay says about the game it holds: the map and the two players.
//
// This reads the header and inflates the first block, and does nothing else. It does not walk
// the game's records. The map and both battle tags sit in the opening bytes of that block, so
// a text search finds them without a parser and without a dependency.
//
// The file also holds who left the game and when, which would say who probably won. Reading
// that means walking every record by its leading byte, which is not worth the code.

export const MAGIC = 'Warcraft III recorded game';

// Where the header says the compressed blocks begin
const BLOCK_START = 0x1c;

const latin1 = new TextDecoder('latin1');

// The block ends on a sync flush and carries no end-of-stream marker, so the stream throws at
// the end. Everything read before the throw is the block's real content.
const inflate = async (block) => {
  const reader = new Blob([block]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();
  const parts = [];
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
    }
  } catch {
    // a truncated tail is expected; keep what came out
  }
  const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

// The map path is stored with every 8th byte a mask of the low bits of the next 7
const unmask = (bytes) => {
  const out = [];
  for (let pos = 0; pos < bytes.length;) {
    const mask = bytes[pos++];
    for (let bit = 0; bit < 7 && pos < bytes.length; bit++) {
      const value = bytes[pos++];
      out.push(mask & (1 << (bit + 1)) ? value : value - 1);
    }
  }
  return latin1.decode(new Uint8Array(out));
};

const MAP = /maps[\\/][^\0]*?\.w3[xm]/i;
const TAG = /[A-Za-z][A-Za-z0-9_.]{1,20}#\d{3,6}/g;

// The masking runs in groups of 8 from the start of its own string, so it only decodes from
// there. The string is one of the runs between null bytes; try each and keep the one that
// reads as a map path.
const findMap = (raw) => {
  for (let start = 0; start < raw.length;) {
    while (start < raw.length && raw[start] === 0) start += 1;
    let end = start;
    while (end < raw.length && raw[end] !== 0) end += 1;
    if (end - start >= 16) {
      const found = MAP.exec(unmask(raw.subarray(start, end)));
      if (found) return found[0];
    }
    start = end + 1;
  }
  return null;
};

/**
 * What a replay says, or null when the file is not a replay this can read.
 * Answers the map path it was played on and the battle tags it names.
 */
export const readReplay = async (file) => {
  const head = new Uint8Array(await file.slice(0, 0x40).arrayBuffer());
  if (latin1.decode(head.subarray(0, MAGIC.length)) !== MAGIC) return null;
  const start = new DataView(head.buffer).getUint32(BLOCK_START, true);
  if (!start || start + 12 >= file.size) return null;

  // the block's own header gives its compressed size; one block is 8 KB inflated, and the
  // map and the players sit in its opening bytes
  const blockHead = new Uint8Array(await file.slice(start, start + 12).arrayBuffer());
  const size = new DataView(blockHead.buffer).getUint32(0, true);
  if (!size || start + 12 + size > file.size) return null;
  const raw = await inflate(new Uint8Array(await file.slice(start + 12, start + 12 + size).arrayBuffer()));
  if (!raw.length) return null;

  const text = latin1.decode(raw);
  return {
    mapPath: findMap(raw),
    tags: [...new Set([...text.matchAll(TAG)].map((hit) => hit[0]))],
  };
};

const fold = (text) => (text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * The map of the pool this replay was played on, or null.
 * W3Champions renames the file per game, so this matches the human part of the path
 * against each map's name and never the filename itself.
 */
export const matchMap = (mapPath, maps) => {
  const path = fold(mapPath);
  if (!path) return null;
  const named = (maps || []).filter((map) => fold(map.name) && path.includes(fold(map.name)));
  // the longest name wins, so "Twisted Meadows" beats a map called "Meadows"
  return named.sort((a, b) => fold(b.name).length - fold(a.name).length)[0] ?? null;
};

/** True when neither battle tag of the replay belongs to this series. */
export const isOtherSeries = (tags, seriesTags) => {
  const mine = (seriesTags || []).filter(Boolean).map(fold);
  if (!mine.length || !tags?.length) return false;
  return !tags.map(fold).some((tag) => mine.includes(tag));
};
