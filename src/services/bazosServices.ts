export const handleBazos = async (url: string, body: string) => {
  const text = body.toLowerCase();

  const isDead = text.includes("this ad is no longer available");

  if (isDead) {
    return { url, status: 404, message: "Not Found " };
  }

  return { url, status: 200, message: "Working" };
};
