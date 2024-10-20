import AnimeSama from "~/providers/anime-sama";

export enum Providers {
  animeSama = "animeSama",
}
export type Provider = {
  getAllMangas: () => Promise<any>;
  getManga: (
    id: string,
    {
      info,
      chapters,
    }: {
      info?: boolean;
      chapters?: boolean;
    }
  ) => Promise<any>;
  getPageUrl?: (
    id: string,
    chapterNum: string | number,
    pageNum: string | number
  ) => string;
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
