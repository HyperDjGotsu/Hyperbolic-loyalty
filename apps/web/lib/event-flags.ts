// Flags staff set in a Google Calendar event description, e.g. "Type: Special".
// Matches anywhere in the text (descriptions can arrive with literal "\n" sequences).
const SPECIAL_RE = /\btype\s*(?::|-|is)\s*special\b[ \t]*(?:\\n)?/gi;

export function parseIsSpecial(text: string): boolean {
  return new RegExp(SPECIAL_RE.source, 'i').test(text);
}

export function stripSpecialFlag(text: string): string {
  return text.replace(SPECIAL_RE, '');
}
