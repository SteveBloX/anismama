import { LoaderFunction, redirect } from "@remix-run/node";
import { getUser } from "~/session.server";
import { getAllMangas } from "~/providers/lib";
import { prisma } from "~/db.server";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  const allMangas = await getAllMangas();
  if (!user) {
    const randomManga = allMangas[Math.floor(Math.random() * allMangas.length)];
    return redirect(`/manga/${randomManga.id}`);
  }
  const userMangas = await prisma.userManga.findMany({
    where: {
      userId: user.id,
    },
  });
  const userMangaIds = userMangas.map((manga) => manga.mangaId);
  const notInLibrary = allMangas.filter(
    (manga) => !userMangaIds.includes(manga.id)
  );
  const randomManga =
    notInLibrary[Math.floor(Math.random() * notInLibrary.length)];
  return redirect(`/manga/${randomManga.id}`);
};
