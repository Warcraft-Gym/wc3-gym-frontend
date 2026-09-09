// Read a Warcraft III replay in the browser. A .w3g is a header followed by zlib blocks;
// DecompressionStream inflates them, so nothing ships to do it.
//
// The file gives up the map it was played on and both battle tags. It does NOT give up the
// winner: the leave events are there but their result codes do not read against the
// documented layout. In a 1v1 the loser almost always leaves first, which is worth a warning
// and never a verdict.

export const MAGIC = 'Warcraft III recorded game';

const latin1 = new TextDecoder('latin1');

// Each block ends on a sync flush and carries no end-of-stream marker, so the stream throws
// at the end. Everything read before the throw is the block's real content.
const inflate = async (block) => {
  const stream = new Blob([block]).stream().pipeThrough(new DecompressionStream('deflate'));
  const reader = stream.getReader();
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
  return join(parts);
};

const join = (parts) => {
  const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

// The settings string is stored with every 8th byte a mask of the low bits of the next 7
const decodeSettings = (bytes) => {
  const out = [];
  for (let pos = 0; pos < bytes.length;) {
    const mask = bytes[pos++];
    for (let bit = 0; bit < 7 && pos < bytes.length; bit++) {
      const value = bytes[pos++];
      out.push(mask & (1 << (bit + 1)) ? value : value - 1);
    }
  }
  return new Uint8Array(out);
};

// The encoded run sits among the opening records; take the first run that decodes to a map path
const readMapPath = (raw) => {
  for (let start = 0; start < Math.min(raw.length, 2048);) {
    while (start < raw.length && raw[start] === 0) start += 1;
    let end = start;
    while (end < raw.length && raw[end] !== 0) end += 1;
    if (end - start >= 16) {
      const text = latin1.decode(decodeSettings(raw.subarray(start, end)));
      const found = /maps[\\/][^\0]*?\.w3[xm]/i.exec(text);
      if (found) return found[0];
    }
    start = end + 1;
  }
  return null;
};

const TAG = /[A-Za-z][A-Za-z0-9_.]{1,20}#\d{3,6}/g;

// Records of a fixed size, by their leading byte
const FIXED = { 0x1a: 4, 0x1b: 4, 0x1c: 4, 0x23: 10, 0x2f: 8 };

// The player ids in the order they left the game, walking the records after the slot record
const readLeaveOrder = (raw, from) => {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const left = [];
  for (let pos = from; pos > 0 && pos < raw.length;) {
    const id = raw[pos];
    if (id === 0x17) {
      left.push(raw[pos + 5]);
      pos += 14;
    } else if (id === 0x1e || id === 0x1f) {
      pos += 3 + view.getUint16(pos + 1, true);
    } else if (id === 0x20) {
      pos += 4 + view.getUint16(pos + 2, true);
    } else if (id === 0x22) {
      pos += 2 + raw[pos + 1];
    } else if (FIXED[id]) {
      pos += 1 + FIXED[id];
    } else {
      break;  // the end of the records, or a record this walk does not know
    }
  }
  return left;
};

// The slot record closes the opening section; the game's records follow it
const recordsStart = (raw) => {
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  for (let pos = 0; pos < Math.min(raw.length, 4096); pos += 1) {
    if (raw[pos] !== 0x19) continue;
    const length = view.getUint16(pos + 1, true);
    if (length > 6 && length < 400 && pos + 3 + length < raw.length) return pos + 3 + length;
  }
  return -1;
};

// A player record names a battle tag right after its player id, so the byte before the tag
// is that player's id. This is how a leave event is tied back to a name.
const readPlayers = (raw) => {
  const text = latin1.decode(raw.subarray(0, Math.min(raw.length, 4096)));
  const players = new Map();
  const seen = new Set();
  for (const hit of text.matchAll(TAG)) {
    const id = raw[hit.index - 1];
    // a tag appears again later under a byte that is not its player id, so first wins
    if (id > 0 && id < 0x18 && !players.has(id) && !seen.has(hit[0])) {
      players.set(id, hit[0]);
      seen.add(hit[0]);
    }
  }
  return players;
};

/**
 * Read a replay file. Answers null when the file is not a replay this can read.
 * `leftFirst` is the battle tag of the player who left first, which usually lost.
 */
export const readReplay = async (file) => {
  const head = new Uint8Array(await file.slice(0, 0x30).arrayBuffer());
  if (latin1.decode(head.subarray(0, MAGIC.length)) !== MAGIC) return null;
  const headView = new DataView(head.buffer);
  const start = headView.getUint32(0x1c, true);
  const blocks = headView.getUint32(0x2c, true);
  if (!start || !blocks || blocks > 4096) return null;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer);
  const parts = [];
  for (let pos = start, done = 0; done < blocks && pos + 12 < bytes.length; done += 1) {
    const size = view.getUint32(pos, true);
    parts.push(await inflate(bytes.subarray(pos + 12, pos + 12 + size)));
    pos += 12 + size;
  }
  const raw = join(parts);
  if (!raw.length) return null;

  const players = readPlayers(raw);
  const order = readLeaveOrder(raw, recordsStart(raw));
  const leftFirst = order.map((id) => players.get(id)).find(Boolean) ?? null;
  return { mapPath: readMapPath(raw), tags: [...players.values()], leftFirst };
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
