export type RecommendationManga = {
  name: string;
  tags: string[];
  id: string;
  score?: number; // Le score est calculé uniquement sur les tags
};

//function

// Fonction pour calculer les scores des mangas
export function recommendMangas(
  readMangas: RecommendationManga[],
  availableMangas: RecommendationManga[]
): RecommendationManga[] {
  const tagScores: Record<string, number> = {};

  // 1. Calculer les scores pour chaque tag en fonction des mangas lus
  readMangas.forEach((manga) => {
    manga.tags.forEach((tag) => {
      if (!tagScores[tag]) {
        tagScores[tag] = 0;
      }
      tagScores[tag] += 1; // Chaque occurrence du tag ajoute +1 au score
    });
  });

  // 2. Attribuer un score à chaque manga disponible en fonction des tags
  const scoredMangas = availableMangas.map((manga) => {
    let score = 0;

    // Calculer le score basé uniquement sur les tags
    manga.tags.forEach((tag) => {
      if (tagScores[tag]) {
        score += tagScores[tag]; // Ajouter le score du tag s'il existe dans les mangas lus
      }
    });

    return { ...manga, score };
  });
  return sortMangas(scoredMangas);
}

// Fonction pour recommander des mangas
export function sortMangas(
  scoredMangas: RecommendationManga[]
): RecommendationManga[] {
  // 1. Filtrer les mangas ayant un score
  const mangasWithScore = scoredMangas.filter(
    (manga) => manga.score !== undefined
  );

  // 2. Trier les mangas par score décroissant
  return mangasWithScore.sort((a, b) => (b.score || 0) - (a.score || 0));
}
