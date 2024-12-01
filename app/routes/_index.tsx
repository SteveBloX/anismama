import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Link, useRouteLoaderData, useSearchParams } from "@remix-run/react";
import { useLoaderData } from "react-router";
import { Input } from "~/components/ui/input";
import { useEffect, useState } from "react";
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
import { Button } from "~/components/ui/button";
import { UserManga } from "@prisma/client";
import { RecommendationManga, recommendMangas } from "~/recommendation";
import useProvider, { getAllMangas, Providers } from "~/providers/lib";
import { ArrowUpRight } from "lucide-react";
import MangaSearchDialog from "~/components/mangaSearchDialog";

export const meta: MetaFunction = () => {
  return [{ title: "Anismama" }, { name: "description", content: "Anismama!" }];
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  console.log("User: " + user ? user?.username : "anyme");
  const scans = await getAllMangas();
  let userMangas: UserManga[] = [];
  if (user) {
    userMangas = await prisma.userManga.findMany({
      where: { userId: user.id },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }
  const usrMangas = userMangas.map((manga) => {
    const correspondingManga = scans.find((scan) => scan.id === manga.mangaId);
    if (!correspondingManga) return;
    return {
      ...manga,
      tags: correspondingManga.tags.map((tag) => tag.toLowerCase()),
    };
  });
  const recommendedManga = recommendMangas(
    usrMangas,
    scans
      .map((scan) => {
        return {
          name: scan.title,
          tags: scan.tags.map((tag) => tag.toLowerCase()),
          id: scan.id,
        };
      })
      .filter((manga) => {
        const corrManga = userMangas.find(
          (usrManga) => usrManga.mangaId === manga.id
        );
        if (!corrManga) return true;
        return !(
          corrManga.isFavorited ||
          corrManga.finished ||
          corrManga.isWatchlisted
        );
      })
  );
  return { scans, userMangas, loggedIn: !!user, recommendedManga };
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
    userMangas,
    recommendedManga,
  }: {
    scans: Scan[];
    userMangas: UserManga[];
    recommendedManga: RecommendationManga[];
  } = useLoaderData() as any;
  const isLoggedIn = useRouteLoaderData("root")?.user;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const filteredScans = scans.filter(
    (scan) =>
      (normalizeString(scan.title).includes(normalizeString(searchTerm)) ||
        normalizeString(scan.alias).includes(normalizeString(searchTerm))) &&
      (selectedTags.length === 0 ||
        selectedTags.every((tag) =>
          scan.tags.map((tag) => tag.toLowerCase()).includes(tag.toLowerCase())
        ))
  );
  const [tagsList] = useState(
    [...new Set(scans.map((scan) => scan.tags).flat())].map((tag) => ({
      label: tag,
      value: tag,
    }))
  );
  const progressions = userMangas
    .filter(
      (manga) => manga.progress && manga.progress !== "{}" && !manga.finished
    )
    .sort((a, b) => {
      //sort by lastRead DateTime
      const lastReadA = new Date(a.lastReadAt).getTime();
      const lastReadB = new Date(b.lastReadAt).getTime();
      console.log(a.mangaId, lastReadB - lastReadA);
      return lastReadB - lastReadA;
    });
  const favoriteMangas = userMangas.filter((manga) => manga.isFavorited);
  const watchlist = userMangas.filter((manga) => manga.isWatchlisted);
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const tags = searchParams.get("tags");
    if (!tags) return;
    setSelectedTags(tags.split("+"));
  }, []);
  const [isMangaSearchOpen, setIsMangaSearchOpen] = useState(false);
  return (
    <div className="p-5">
      <div className="justify-center flex">
        {isLoggedIn && (
          <div className="mb-5 w-2/3">
            <Link
              to="/library?tab=reading"
              className="text-3xl font-bold mb-3 flex justify-center w-full"
            >
              Reprendre la lecture
              <button>
                <ArrowUpRight />
              </button>
            </Link>
            {progressions.length > 0 ? (
              <Carousel
                opts={{
                  dragFree: true,
                }}
                className=""
              >
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
                    const lastChapterNum = parseInt(lastChapter);
                    return (
                      <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                        <Link
                          className="p-2 border-gray-100 border rounded-lg shadow-sm flex flex-col justify-between"
                          to={`/read/${manga.mangaId}/${lastChapterNum}`}
                        >
                          <div>
                            <div className="relative rounded-lg overflow-hidden">
                              <img
                                src={
                                  scans.find(
                                    (scan) => scan.id === manga.mangaId
                                  )?.img
                                }
                                alt={
                                  scans.find(
                                    (scan) => scan.id === manga.mangaId
                                  )?.title
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
            ) : (
              <div className="border-dashed border-2 border-gray-200 h-52 flex justify-center items-center flex-col w-4/5 lg:w-full rounded-md">
                <h3 className="text-lg text-gray-600">Aucun manga en cours</h3>
                <span className="text-sm text-gray-400">
                  Commencez à lire un manga pour le voir ici
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="justify-center flex">
        {isLoggedIn && (
          <div className="mb-5 w-2/3">
            <Link
              to="/library?tab=favorites"
              className="text-3xl font-bold mb-3 flex justify-center w-full"
            >
              Favoris
              <button>
                <ArrowUpRight />
              </button>
            </Link>
            {favoriteMangas.length > 0 ? (
              <Carousel
                opts={{
                  dragFree: true,
                }}
                className=""
              >
                <CarouselContent className="mb-5">
                  {favoriteMangas.map((manga) => (
                    <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                      <Link
                        className="p-2 border-gray-100 border rounded-lg shadow-sm flex flex-col justify-between"
                        to={`/manga/${manga.mangaId}`}
                      >
                        <div>
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
            ) : (
              <button
                className="border-dashed border-2 border-gray-200 h-52 flex justify-center items-center flex-col w-4/5 lg:w-full rounded-md hover:border-gray-400"
                onClick={() => setIsMangaSearchOpen(true)}
              >
                <h3 className="text-lg text-gray-600">
                  Aucun manga en favoris
                </h3>
                <span className="text-sm text-gray-400">
                  Appuie ici pour commencer à chercher des mangas !
                </span>
              </button>
            )}
          </div>
        )}
      </div>
      {/*<div className="justify-center flex">
        {watchlist.length > 0 && (
          <div className="mb-5 w-2/3">
            <Link
              to="/library?tab=watchlist"
              className="text-3xl font-bold mb-3 flex justify-center w-full"
            >
              Watchlist
              <button>
                <ArrowUpRight />
              </button>
            </Link>
            <Carousel className="">
              <CarouselContent className="mb-5">
                {watchlist.map((manga) => (
                  <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                    <Link
                      className="p-2 border-gray-100 border rounded-lg shadow-lg flex flex-col justify-between"
                      to={`/manga/${manga.mangaId}`}
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
      </div>*/}
      <div className="justify-center flex">
        {isLoggedIn && recommendedManga.length > 0 && (
          <div className="mb-5 w-2/3">
            <h1 className="text-3xl font-bold mb-3 flex items-center justify-center gap-3">
              Recommandations
            </h1>
            <Carousel
              opts={{
                dragFree: true,
              }}
              className=""
            >
              <CarouselContent className="mb-5">
                {recommendedManga.map((manga, i) => (
                  <CarouselItem className={`md:basis-1/2 lg:basis-1/3`}>
                    <Link
                      className="p-2 border-gray-100 border rounded-lg shadow-sm flex flex-col justify-between"
                      to={`/manga/${manga.id}`}
                    >
                      <div>
                        <img
                          src={scans.find((scan) => scan.id === manga.id)?.img}
                          alt={manga.name}
                          className="rounded-lg"
                        />

                        <h1 className="mt-2">{manga.name}</h1>
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
      <div>
        <h1 className="text-3xl font-bold text-center mb-3" id="search">
          Recherche
        </h1>
        <div className="flex justify-center w-full">
          <div className="flex justify-center flex-col lg:flex-row mb-3 lg:mb-5 gap-1 lg:w-1/2">
            <Input
              placeholder="Rechercher"
              className="shadow-none lg:shadow-lg lg:w-2/3 p-5 text-md md:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <MultiSelect
              options={tagsList}
              onValueChange={setSelectedTags}
              defaultValue={selectedTags}
              value={selectedTags}
              placeholder="Genre"
              className="lg:w-1/3 shadow-none lg:shadow-lg"
            />
          </div>
        </div>
        {filteredScans.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-4">
            {filteredScans.map((manga, i) => (
              <Link to={`/manga/${manga.id}`} key={i}>
                <div className="p-2 border-gray-100 border rounded-lg shadow-sm">
                  <img
                    src={manga.img}
                    alt={manga.title}
                    className="rounded-lg"
                    loading="lazy"
                  />
                  <h1 className="mt-2">{manga.title}</h1>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex justify-center w-full">
            <div className="border-dashed border-2 border-gray-200 h-52 flex justify-center items-center flex-col w-4/5 lg:w-1/2 rounded-md">
              <h3 className="text-lg text-gray-600">Aucun résultat</h3>
              <span className="text-sm text-gray-400">
                Essayez de chercher autre chose
              </span>
            </div>
          </div>
        )}
      </div>
      <MangaSearchDialog
        isAutocompleteOpen={isMangaSearchOpen}
        setIsAutocompleteOpen={setIsMangaSearchOpen}
        onMangaNavigate={() => {
          setIsMangaSearchOpen(false);
        }}
      />
    </div>
  );
}
