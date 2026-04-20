export function resourceToVector(r) {
  return {
    price: r.price || 0,
    capacity: r.attributes?.get("capacity") || 0,
    category: r.category,
    location: r.location || ""
  };
}

export function eventToVector(e) {
  return {
    price: e.budget || 0,
    capacity: e.nombreParticipants || 0,
    category: e.category,
    location: e.lieu || ""
  };
}

export function isResourceAvailable(resource, event) {
  if (!resource.availability) return false;

  return resource.availability.some(d => {
    if (!d.satut_disp) return false;

    return (
      new Date(event.dateDebut) >= new Date(d.date_deb) &&
      new Date(event.dateFin) <= new Date(d.date_fin)
    );
  });
}

// 🔥 keywords
export function extractKeywords(text = "") {
  const stopWords = ["le", "la", "de", "un", "avec", "et"];

  return text
    .toLowerCase()
    .split(" ")
    .filter(w => !stopWords.includes(w));
}

export function keywordScore(resource, keywords) {
  let score = 0;

  const text = (
    resource.name +
    " " +
    resource.description +
    " " +
    resource.category
  ).toLowerCase();

  keywords.forEach(k => {
    if (text.includes(k)) score++;
  });

  return keywords.length ? score / keywords.length : 0;
}