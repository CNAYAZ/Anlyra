/**
 * Makes free-typed text safe to put inside an email Subject line.
 *
 * A DIFFERENT risk from the HTML body, where escapeHtml (templates/_escape.ts)
 * is the right tool: HTML-escaping is irrelevant to a Subject header. The
 * concern here is characters that are structural to the header itself. A raw
 * carriage-return or line-feed inside a value used to build a Subject can
 * terminate that header early and let the rest of the string be read as
 * ADDITIONAL headers — the classic email header injection, e.g. a name
 * containing "Mario" followed by a line break and then "Bcc: x@evil.com",
 * smuggling a Bcc onto an email the sender never asked to send. Whatever
 * Resend's own API does with a raw newline in a JSON subject field is not
 * something this app's safety should depend on; this sanitizes on our side
 * regardless, and it also keeps a subject from silently carrying other
 * invisible control characters that would just show up as junk in an inbox.
 *
 * Strips every Unicode control character — the C0 set (code points 0
 * through 31, which includes carriage return, line feed and tab) and the C1
 * set (code points 127 through 159) — rather than only carriage-return/
 * line-feed, collapses the whitespace that stripping tabs/newlines can leave
 * behind, trims, and caps length: a Subject is meant to be one short line,
 * not an arbitrarily long string typed by whoever supplied the name.
 *
 * Deliberately built by walking code points and comparing plain numbers,
 * never by writing the control-character range as an escape sequence in a
 * regex or string literal: an earlier draft of this exact file did that and,
 * somewhere between being written and landing on disk, the escape sequences
 * were replaced by the literal unprintable bytes they described — invisible
 * in a normal editor, and exactly the kind of thing this function exists to
 * strip out of OTHER people's input. Numeric comparisons on code points read
 * from the string at runtime cannot suffer that failure mode.
 */
const MAX_SUBJECT_LENGTH = 200;

const C0_MAX = 31;
const C1_MIN = 127;
const C1_MAX = 159;

function isControlCodePoint(codePoint: number): boolean {
  return codePoint <= C0_MAX || (codePoint >= C1_MIN && codePoint <= C1_MAX);
}

export function sanitizeSubjectText(value: string): string {
  let withoutControlChars = '';
  for (const ch of value) {
    withoutControlChars += isControlCodePoint(ch.codePointAt(0) ?? 0) ? ' ' : ch;
  }
  const collapsed = withoutControlChars.replace(/\s+/g, ' ').trim();
  return collapsed.slice(0, MAX_SUBJECT_LENGTH);
}
