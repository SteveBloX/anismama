import { parse } from "node-html-parser";
import { prisma } from "~/db.server";
import useProvider, { Providers } from "~/providers/lib";

export default async function createManga(id: string) {
  const provider = useProvider(Providers.animeSama);
  const data = await provider.getManga(id, { info: true, chapters: true });
  const {
    coverImg,
    title,
    synopsis,
    tags,
    alternateNames,
    chaptersAmount,
    chaptersDetails,
  } = data;
  const newManga = await prisma.manga.create({
    data: {
      mangaId: id,
      title: title || id,
      description: synopsis,
      cover: coverImg,
      chaptersAmount: chaptersAmount || 0,
      tags: JSON.stringify(tags),
    },
  });
  return data;
}
