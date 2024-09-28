import { LoaderFunction } from "@remix-run/node";
import { prisma } from "~/db.server";

export const loader: LoaderFunction = async ({ request }) => {
  const mangaProgressions = await prisma.mangaProgression.findMany({});
  const favoriteMangas = await prisma.favoritedManga.findMany({});
  const watchlistMangas = await prisma.watchlistedManga.findMany({});
  const userMangas = await prisma.userManga.findMany({});
  for (const mangaProgression of mangaProgressions) {
    const mangaId = mangaProgression.mangaId;
    const userManga = userMangas.find(
      (userManga) => userManga.mangaId === mangaId
    );
    if (!userManga) {
      await prisma.userManga.create({
        data: {
          mangaId,
          userId: mangaProgression.userId,
          progress: mangaProgression.progress,
          finished: mangaProgression.finished,
          timesFinished: mangaProgression.timesFinished,
        },
      });
    } else {
      await prisma.userManga.update({
        where: { id: userManga.id },
        data: {
          progress: mangaProgression.progress,
          finished: mangaProgression.finished,
          timesFinished: mangaProgression.timesFinished,
        },
      });
    }
  }
  for (const favoriteManga of favoriteMangas) {
    const userManga = userMangas.find(
      (userManga) => userManga.mangaId === favoriteManga.mangaId
    );
    if (!userManga) {
      await prisma.userManga.create({
        data: {
          userId: favoriteManga.userId,
          mangaId: favoriteManga.mangaId,
          isFavorited: true,
        },
      });
    } else {
      await prisma.userManga.update({
        where: { id: userManga.id },
        data: { isFavorited: true },
      });
    }
  }
  for (const watchlistManga of watchlistMangas) {
    const userManga = userMangas.find(
      (userManga) => userManga.mangaId === watchlistManga.mangaId
    );
    if (!userManga) {
      await prisma.userManga.create({
        data: {
          userId: watchlistManga.userId,
          mangaId: watchlistManga.mangaId,
          isWatchlisted: true,
        },
      });
    } else {
      await prisma.userManga.update({
        where: { id: userManga.id },
        data: { isWatchlisted: true },
      });
    }
  }
  return null;
};
