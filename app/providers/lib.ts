import AnimeSama from "~/providers/anime-sama";
import { IndexManga, MangaChapters, MangaInfo } from "~/types";

export enum Providers {
  animeSama = "animeSama",
}
export type Provider = {
  getAllMangas: () => Promise<IndexManga[]>;
  getManga: (
    id: string,
    {
      info,
      chapters,
    }: {
      info?: boolean;
      chapters?: boolean;
    }
  ) => Promise<MangaInfo & MangaChapters>;
  getPageUrl: (
    id: string,
    chapterNum: string | number,
    pageNum: string | number
  ) => string;
  searchManga: (query: string) => Promise<IndexManga[]>;
};

export default function useProvider(name: Providers) {
  switch (name) {
    case Providers.animeSama:
      return AnimeSama;
  }
}

export async function getAllMangas() {
  return [...(await AnimeSama.getAllMangas())];
}
