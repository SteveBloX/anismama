export type RecommendationManga = {
  name: string;
  tags: string[];
  timesRead?: number;
  isFavorite?: boolean;
  id: string;
};

export function recommendMangas(
  readMangas: RecommendationManga[],
  availableMangas: RecommendationManga[]
): RecommendationManga[] {
  const tagScores: Record<string, number> = {};

  // 1. Parcourir les mangas lus par l'utilisateur pour analyser les tags et la fréquence
  readMangas.forEach((manga) => {
    manga.tags.forEach((tag) => {
      if (!tagScores[tag]) {
        tagScores[tag] = 0;
      }
      // Plus le manga a été lu, plus les tags associés prennent de l'importance
      tagScores[tag] += manga.timesRead;
    });
  });

  // 2. Filtrer les mangas disponibles qui n'ont pas encore été lus
  const unreadMangas = availableMangas.filter(
    (manga) => !readMangas.some((readManga) => readManga.name === manga.name)
  );

  // 3. Attribuer un score de recommandation à chaque manga non lu
  const recommendedMangas = unreadMangas.map((manga) => {
    let score = 0;

    // Calculer le score basé sur les tags
    manga.tags.forEach((tag) => {
      if (tagScores[tag]) {
        score += tagScores[tag]; // Plus le tag est fréquent, plus le score augmente
      }
    });

    // Si le manga est favori dans les mangas lus, cela augmente la recommandation des mangas avec les mêmes tags
    const isFavoriteMatch = readMangas.some(
      (readManga) =>
        readManga.isFavorite &&
        readManga.tags.some((tag) => manga.tags.includes(tag))
    );
    if (isFavoriteMatch) {
      score *= 1.5; // Bonus pour les mangas dont les tags sont associés aux favoris
    }

    return { ...manga, score };
  });

  // 4. Trier les mangas par score décroissant
  return recommendedMangas.sort((a, b) => b.score - a.score);
}
