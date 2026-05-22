export function extractYouTubeId(url) {
  if (!url) return null;
  const str = String(url).trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(str)) return str;
  const match = str.match(/(?:v=|\/vi\/|\/v\/|youtu\.be\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}
