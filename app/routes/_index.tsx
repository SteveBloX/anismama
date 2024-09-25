import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { parse } from "node-html-parser";
import { useLoaderData } from "react-router";
import { Input } from "~/components/ui/input";
import { useState } from "react";
import { normalizeString } from "~/utils";
import { MultiSelect } from "~/components/multi-select";
import { prisma } from "~/db.server";
import { getUser } from "~/session.server";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  const res = await fetch("https://anime-sama.fr/catalogue/listing_all.php");
  const text = await res.text();
  const root = parse(text);
  const scanEls = root.querySelectorAll(".Scans");
  const scans = scanEls.map((el) => {
    const title = el.querySelector("h1")?.text;
    const link = el.querySelector("a")?.getAttribute("href");
    const img = el.querySelector("img")?.getAttribute("src");
    const alias = el.querySelector("p")?.text;
    const id = link.split("catalogue/")[1].split("/")[0];
    const tags = [...el.classList._set]
      .filter(
        (tag) =>
          !["cardListAnime", "Scans", " ", "-", "VOSTFR", "VF", ""].includes(
            tag
          )
      )
      .map((tag) => tag.replace(",", ""));
    return { title, link, img, alias, id, tags };
  });
  let progressions = [];
  let favoriteMangas = [];
  let watchlist = [];
  if (user) {
    progressions = await prisma.mangaProgression.findMany({
      where: {
        userId: user.id,
        finished: false,
      },
    });
    favoriteMangas = await prisma.favoritedManga.findMany({
      where: {
        userId: user.id,
      },
    });
    watchlist = await prisma.watchlistedManga.findMany({
      where: {
        userId: user.id,
      },
    });
  }
  return { scans, progressions, favoriteMangas, watchlist };
};
type Scan = {
  title: string;
  link: string;
  img: string;
  alias: string;
  id: string;
  tags: string[];
};

export default function Index() {
  const {
    scans,
    progressions,
    favoriteMangas,
    watchlist,
  }: {
    scans: Scan[];
    progressions: { mangaId: string; progress: string }[];
    favoriteMangas: { mangaId: string }[];
    watchlist: { mangaId: string }[];
  } = useLoaderData() as any;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const filteredScans = scans.filter(
    (scan) =>
      (normalizeString(scan.title).includes(normalizeString(searchTerm)) ||
        normalizeString(scan.alias).includes(normalizeString(searchTerm))) &&
      (selectedTags.length === 0 ||
        selectedTags.every((tag) => scan.tags.includes(tag)))
  );
  const [tagsList] = useState(
    [...new Set(scans.map((scan) => scan.tags).flat())].map((tag) => ({
      label: tag,
      value: tag,
    }))
  );

  return (
    <div className="p-5">
      <div className="justify-center flex">
        {progressions.length > 0 && (
          <div className="mb-5 w-2/3">
            <h1 className="text-3xl font-bold text-center mb-3">
              Reprendre la lecture
            </h1>
            <Carousel className="">
              <CarouselContent className="mb-5">
                {progressions.map((manga) => {
                  const progress = JSON.parse(manga.progress) as {
                    [chapterNum: string]: {
                      currentPage: number;
                      totalPages: number;
                    };
                  };
                  const lastChapter = Object.keys(progress)
                    .sort((a, b) => parseInt(a) - parseInt(b))
                    .pop();
                  const progressPercentage = `${
                    ((progress[lastChapter].currentPage + 1) /
                      progress[lastChapter].totalPages) *
                    100
                  }%`;
                  console.log(progressPercentage);
                  const lastChapterNum = parseInt(lastChapter);
                  return (
                    <CarouselItem className="lg:basis-1/3">
                      <Link
                        className="p-2 border-gray-100 border rounded-lg shadow-lg flex flex-col justify-between"
                        to={`/read/${manga.mangaId}/${lastChapterNum}`}
                      >
                        <div>
                          <div className="relative rounded-lg overflow-hidden">
                            <img
                              src={
                                scans.find((scan) => scan.id === manga.mangaId)
                                  ?.img
                              }
                              alt={
                                scans.find((scan) => scan.id === manga.mangaId)
                                  ?.title
                              }
                              className="rounded-lg"
                            />
                            <div
                              style={{
                                width: progressPercentage,
                                ...(progressPercentage !== "100%" && {
                                  borderTopRightRadius: "100px",
                                  borderBottomRightRadius: "100px",
                                }),
                              }}
                              className="bg-black h-2 absolute bottom-0 left-0"
                            />
                          </div>
                          <h1 className="mt-2">
                            {
                              scans.find((scan) => scan.id === manga.mangaId)
                                ?.title
                            }
                          </h1>
                        </div>
                        <span className="text-gray-400">
                          Chapitre {lastChapterNum}
                        </span>
                      </Link>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselNext />
              <CarouselPrevious />
            </Carousel>
          </div>
        )}
      </div>
      <div className="justify-center flex">
        {favoriteMangas.length > 0 && (
          <div className="mb-5 w-2/3">
            <h1 className="text-3xl font-bold text-center mb-3">Favoris</h1>
            <Carousel className="">
              <CarouselContent className="mb-5">
                {favoriteMangas.map((manga) => (
                  <CarouselItem className="lg:basis-1/3">
                    <Link
                      className="p-2 border-gray-100 border rounded-lg shadow-lg flex flex-col justify-between"
                      to={`/read/${manga.mangaId}/latest`}
                    >
                      <div>
                        <img
                          src={
                            scans.find((scan) => scan.id === manga.mangaId)?.img
                          }
                          alt={
                            scans.find((scan) => scan.id === manga.mangaId)
                              ?.title
                          }
                          className="rounded-lg"
                        />

                        <h1 className="mt-2">
                          {
                            scans.find((scan) => scan.id === manga.mangaId)
                              ?.title
                          }
                        </h1>
                      </div>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselNext />
              <CarouselPrevious />
            </Carousel>
          </div>
        )}
      </div>

      <div className={"flex justify-center"}>
        <Input
          placeholder="Search"
          className="shadow-lg w-1/2 p-5 mb-5"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <MultiSelect
          options={tagsList}
          onValueChange={setSelectedTags}
          value={selectedTags}
        />
      </div>
      <div className="grid grid-cols-5 gap-4">
        {filteredScans.map((manga) => (
          <Link to={`/read/${manga.id}/1`} target="_blank">
            <div className="p-2 border-gray-100 border rounded-lg shadow-lg">
              <img src={manga.img} alt={manga.title} className="rounded-lg" />
              <h1 className="mt-2">{manga.title}</h1>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
