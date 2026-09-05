/**
 * Shared rule for "display name" fields whose value can end up in an email
 * sent to someone else — User.name and Organization.name today. Rejects
 * outright rather than silently stripping, so the person typing it sees why
 * their save failed instead of having their input quietly mangled.
 *
 * Deliberately narrow: rejects Unicode CONTROL characters only — the C0 set
 * (code points 0 through 31, which includes carriage return, line feed and
 * tab) and the C1 set (code points 127 through 159). Normal punctuation,
 * spaces, apostrophes, hyphens and accented letters (a, e with a grave or
 * acute accent, o with an umlaut, and so on) all sit well above code point
 * 159 and are left completely alone — a name like "Niccolo D'Amico-Rossi"
 * passes through untouched. What this exists to stop is not unusual
 * punctuation, it is the specific characters that let a name break out of an
 * HTML attribute or smuggle a fake header into an email — see
 * src/lib/email/templates/_escape.ts and src/lib/email/subject.ts for how
 * those same two risks are handled again at the point the name is actually
 * rendered, as defense in depth for names already stored before this existed.
 *
 * Built by walking code points and comparing plain numbers rather than a
 * regex spelling out the control-character range as an escape sequence: an
 * earlier version of a sibling file (src/lib/email/subject.ts) did that and
 * the escape sequences were replaced by the literal unprintable bytes they
 * described somewhere between being written and landing on disk — invisible
 * in a normal editor. Numeric comparisons on code points read from the
 * string at runtime cannot suffer that failure mode.
 */
const C0_MAX = 31;
const C1_MIN = 127;
const C1_MAX = 159;

function isControlCodePoint(codePoint: number): boolean {
  return codePoint <= C0_MAX || (codePoint >= C1_MIN && codePoint <= C1_MAX);
}

export function hasControlChars(value: string): boolean {
  for (const ch of value) {
    if (isControlCodePoint(ch.codePointAt(0) ?? 0)) return true;
  }
  return false;
}

export const NO_CONTROL_CHARS_MESSAGE = 'Il testo non può contenere caratteri di controllo o ritorni a capo.';
