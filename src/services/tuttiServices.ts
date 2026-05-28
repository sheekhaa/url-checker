export const handleTutti = (url: string, body: string) => {
  const text = body.toLowerCase();

  const deadTexts = [
    "nicht gefunden",
    "we can’t find that",
    "we can't find that",
    "angebot nicht mehr verfügbar",
    "this listing is no longer available",
    "sorry, the listing you are looking for is no longer available",
    "listing no longer available",
    "article is no longer available",
    "annonce non disponible",
  ];

  const isDead = deadTexts.some((t) => text.includes(t.toLowerCase()));

  if (isDead) {
    return {
      url,
      status: 404,
      message: "Not Found",
    };
  }

  return {
    url,
    status: 200,
    message: "Still Active",
  };
};
