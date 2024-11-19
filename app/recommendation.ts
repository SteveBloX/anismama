import { Manga, UserManga } from "@prisma/client";
import { IndexManga, MangaInfo } from "~/types";

type UserMangaWithTags = UserManga & { tags: string[] };

export function recommendMangas(
  readMangas: UserMangaWithTags[],
  allMangas: MangaInfo[]
): Manga[] {
  const tagScores: Record<string, number> = {};

  // 1. Calculer les scores pour chaque tag en fonction des mangas lus
  readMangas.forEach((manga) => {
    let score = 0;
    if (manga.isFavorited) {
      score += 2;
    }
    if (manga.isCrushed) {
      score += 5;
    }
    if (manga.finished && manga.rating && manga.rating > 2) {
      score += 3;
    }
    if (manga.rating) {
      score += manga.rating * 2 - 5;
    }

    manga.tags.forEach((tag) => {
      if (!tagScores[tag]) {
        tagScores[tag] = 0;
      }
      tagScores[tag] += score; // Chaque occurrence du tag ajoute +1 au score
    });
  });
  // 2. Attribuer un score à chaque manga disponible en fonction des tags
  const scoredMangas = allMangas.map((manga) => {
    let score = 0;
    // Calculer le score basé uniquement sur les tags
    manga.tags.forEach((tag: string) => {
      if (tagScores[tag]) {
        score += tagScores[tag]; // Ajouter le score du tag s'il existe dans les mangas lus
      }
    });
    return { ...manga, score };
  });
  return sortMangas(scoredMangas);
}

// Fonction pour recommander des mangas
export function sortMangas(scoredMangas: MangaInfo[]): MangaInfo[] {
  // 1. Filtrer les mangas ayant un score
  const mangasWithScore = scoredMangas.filter(
    (manga) => manga.score !== undefined
  );

  // 2. Trier les mangas par score décroissant
  return mangasWithScore
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 10);
}

export function recommendByTags(
  allMangas: IndexManga[],
  tags: string[]
): IndexManga[] {
  // attribuer un score à chaque manga en fonction des tags
  const scoredMangas = allMangas.map((manga) => {
    let score = 0;
    manga.tags.forEach((tag) => {
      if (tags.includes(tag)) {
        score += 1;
      }
    });
    return { ...manga, score };
  });
  return sortMangas(scoredMangas);
}
