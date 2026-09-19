/**
 * Decode the bytes of a CSV/TXT upload into text, recognizing the encoding
 * instead of assuming UTF-8.
 *
 * ── THE PROBLEM ──
 * The parser read every upload as UTF-8. A CSV saved by Excel in Italian with
 * "Salva come CSV" — the option a normal person picks, as opposed to "CSV
 * UTF-8" — is Windows-1252, and so are the exports of several older bank
 * portals. Read as UTF-8, every accented letter became a replacement
 * character: "Bolletta elettricità" arrived as "Bolletta elettricit�",
 * with no error, no warning, and the corruption written to the database
 * forever.
 *
 * ── WHY DETECTING IS RELIABLE HERE, AND NOT A GUESS ──
 * The test is not a heuristic about which language or which bytes look more
 * likely: it is a FACT about the bytes. UTF-8 is a self-validating encoding —
 * a lone 0xE0 byte (Windows-1252 'à') followed by an ASCII letter is simply not
 * a legal UTF-8 sequence. So: try a STRICT UTF-8 decode; if the bytes are
 * valid UTF-8 they are treated as UTF-8, and only bytes that cannot be UTF-8
 * at all take the Windows-1252 path. That is why this needs no "are you sure?"
 * question to the customer: there is nothing to be unsure about.
 *
 * ── THE VALID-UTF-8 PATH IS BYTE-FOR-BYTE THE OLD PATH ──
 * On success it returns `buf.toString('utf8')`, exactly what the parser did
 * before, rather than the TextDecoder's output — TextDecoder strips the BOM by
 * default and that would be a change for every file that already works today.
 * The strict decode above is used only as a validity probe and its result is
 * thrown away. The new code therefore activates ONLY for files that are broken
 * today, and files that import correctly today go through unchanged, BOM
 * included.
 *
 * ── NO NEW DEPENDENCY ──
 * iconv-lite is present in node_modules but only as a transitive dependency of
 * something else (verified: it is not in package.json), so production code must
 * not rely on it — an unrelated `npm install` could take it away. Windows-1252
 * is therefore decoded with Node built-ins: 'latin1' covers 0xA0–0xFF, which is
 * every accented letter Italian needs, and the 0x80–0x9F range — where
 * Windows-1252 differs from latin1, and where the euro sign lives — is mapped
 * explicitly below.
 *
 * XLSX files never come through here: inside an .xlsx the text is UTF-8 XML,
 * and ExcelJS decodes it itself.
 */

/**
 * Windows-1252 code points for 0x80–0x9F, the only range where it differs from
 * ISO-8859-1 (latin1). Entries that are undefined in the standard are left out
 * and keep whatever latin1 produced.
 */
const CP1252_HIGH: Record<number, string> = {
  0x80: '€', // €
  0x82: '‚',
  0x83: 'ƒ',
  0x84: '„',
  0x85: '…', // …
  0x86: '†',
  0x87: '‡',
  0x88: 'ˆ',
  0x89: '‰',
  0x8a: 'Š',
  0x8b: '‹',
  0x8c: 'Œ',
  0x8e: 'Ž',
  0x91: '‘', // ‘
  0x92: '’', // ’ (very common: apostrophe in Excel exports)
  0x93: '“', // “
  0x94: '”', // ”
  0x95: '•', // •
  0x96: '–', // –
  0x97: '—', // —
  0x98: '˜',
  0x99: '™', // ™
  0x9a: 'š',
  0x9b: '›',
  0x9c: 'œ',
  0x9e: 'ž',
  0x9f: 'Ÿ',
};

function decodeWindows1252(buf: Buffer): string {
  let out = '';
  for (const byte of buf) {
    out += byte >= 0x80 && byte <= 0x9f ? (CP1252_HIGH[byte] ?? String.fromCharCode(byte)) : String.fromCharCode(byte);
  }
  return out;
}

export type DecodedText = {
  text: string;
  /** Which encoding the bytes turned out to be. */
  encoding: 'utf-8' | 'windows-1252';
};

export function decodeImportText(buf: Buffer): DecodedText {
  try {
    // Validity probe only — the result is deliberately discarded, see above.
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return { text: buf.toString('utf8'), encoding: 'utf-8' };
  } catch {
    return { text: decodeWindows1252(buf), encoding: 'windows-1252' };
  }
}
