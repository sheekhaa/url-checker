export const handleAukro = (url: string, body: string) => {
  const text = body.toLowerCase();

  const isDead =
    text.includes("aukce byla ukončena") ||
    text.includes("nabídka již není dostupná");

  if (isDead) {
    return { url, status: 404, message: "Not Found" };
  }

  return { url, status: 200, message: "Working" };
};
