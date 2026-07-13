// getFirstName — extracts a sensible first name for greetings, skipping
// common academic/professional honorifics so "Dr. Amina Al Suwaidi" greets
// as "Amina" rather than "Dr."
const HONORIFICS = new Set([
  "dr", "dr.", "prof", "prof.", "professor", "mr", "mr.", "mrs", "mrs.",
  "ms", "ms.", "miss", "eng", "eng.", "sir", "dame",
]);

export function getFirstName(fullName) {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  const firstReal = parts.find((p) => !HONORIFICS.has(p.toLowerCase()));
  return firstReal || parts[0];
}
