export const handleTutti = (url: string, body: string) => {
  const text = body.toLowerCase();

  const isDead =
    text.includes("nicht gefunden") ||
    text.includes("we can’t find that") ||
    text.includes("angebot nicht mehr verfügbar");

  if (isDead) {
    return { url, status: 404, message: "Not Found" };
  }

  return { url, status: 200, message: "Working" };
};
