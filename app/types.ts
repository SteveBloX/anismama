export type MangaInfo = {
  coverImg?: string | undefined;
  title: string;
  synopsis: string;
  tags: string[];
  alternateNames: string[];
  score?: number;
};

export type MangaChapters = {
  chaptersAmount: number;
  chaptersDetails: {
    number: number;
    pagesAmount: number;
  }[];
};

export type IndexManga = {
  title: string;
  link: string;
  img: string;
  alias: string;
  id: string;
  tags: string[];
};
