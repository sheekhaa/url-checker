export const detectPlatform = (url: string): string => {
  const u = url.toLowerCase();

  if (u.includes("facebook.com/marketplace")) return "facebook-marketplace";

  if (u.includes("facebook.com")) return "facebook";
  if (u.includes("instagram.com")) return "instagram";
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("pinterest.com")) return "pinterest";
  if (u.includes("bazos.cz") || u.includes("bazos.sk")) return "bazos";
  if (u.includes("tutti.ch")) return "tutti";
  if (u.includes("aukro.cz")) return "aukro";
  if (
    u.includes("vinted.") ||
    u.includes("Vinted.lv") ||
    u.includes("Vinted.de") ||
    u.includes("vinted.pl") ||
    u.includes("Vinted.hu")
  )
    return "vinted";
  if (u.includes("ebay.") || u.includes("ebay.co.uk")) return "ebay";

  return "unknown";
};
