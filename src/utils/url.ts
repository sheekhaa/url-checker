export const normalizeUrl = (url: string) => {
  // if url is undefined/empty, return empty string
  if (!url || typeof url !== "string") return "";
  return url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`;
};
