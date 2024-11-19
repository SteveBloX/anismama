import { ToggleGroup } from "@radix-ui/react-toggle-group";
import {
  ActionFunction,
  json,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import {
  ChevronsUpDown,
  ClockArrowUp,
  History,
  RotateCcw,
  Star,
  X,
  Heart,
} from "lucide-react";
import { parse } from "node-html-parser";
import { ToggleGroupItem } from "~/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { getUser } from "~/session.server";
import { prisma } from "~/db.server";
import { UserManga } from "@prisma/client";
import { useEffect, useState } from "react";
import { Input } from "~/components/ui/input";
import { normalizeString, submit } from "~/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";
import { ResponsiveDialog } from "~/components/reponsive-dialog";
import { useNavigate, useRevalidator } from "react-router";
import { useMediaQuery } from "~/hooks/use-media-query";
import Navbar from "~/components/navbar";
import useProvider, { Providers } from "~/providers/lib";
import createManga from "~/createManga";
import Rating from "~/components/rating";
import { useColor } from "color-thief-react";
import { formatDistance, formatRelative } from "date-fns";
import { fr } from "date-fns/locale";
import { IndexManga } from "~/types";

export const meta: MetaFunction = ({ data }: { data: any }) => {
  if (!data) return [];
  return [
    {
      title: "Anismama | " + data.title,
    },
  ];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getUser(request);
  if (!params.name) {
    return new Response(null, { status: 404 });
  }
  let prov = Providers.animeSama;
  const manga = await prisma.manga.findFirst({
    where: {
      id: params.name,
    },
  });
  if (manga) {
    prov = manga.provider as Providers;
  }
  const provider = useProvider(prov);
  /*const variants = root.querySelectorAll("h2").find((el) => el.text === "Manga")
    ?.nextElementSibling?.innerHTML;
  .map((el) => {});
  console.log(variants);*/
  let userManga;
  if (user) {
    userManga = await prisma.userManga.findFirst({
      where: {
        userId: user.id,
        mangaId: params.name,
      },
    });
  }
  const info = await provider.getManga(params.name, {
    info: true,
    chapters: false,
  });
  const ratings = await prisma.userManga.findMany({
    where: {
      mangaId: params.name,
      rating: {
        not: null,
      },
    },
    select: {
      rating: true,
    },
  });
  const ratingsSum = ratings.reduce((acc, curr) => acc + curr.rating, 0);
  const ratingsCount = ratings.length;
  const avgRating = ratingsCount > 0 ? ratingsSum / ratingsCount : NaN;
  return json({
    isLoggedIn: !!user,
    id: params.name,
    userManga,
    avgRating,
    ...info,
  });
};

export function shouldRevalidate() {
  return false;
}

export const action: ActionFunction = async ({ request }) => {
  const user = await getUser(request);
  if (!user) {
    return new Response(null, { status: 401 });
  }
  const data = await request.formData();
  const action = data.get("action") as Actions;
  const mangaId = data.get("id") as string;
  switch (action) {
    case Actions.SetSettings:
      const isFavorite = (data.get("isFavorite") as string) !== "0";
      const isWatchlist = (data.get("isWatchlist") as string) !== "0";
      const userManga = await prisma.userManga.findFirst({
        where: {
          userId: user.id,
          mangaId,
        },
        select: {
          id: true,
          manga: {
            select: {
              id: true,
            },
          },
        },
      });
      if (!userManga) {
        const manga = await prisma.manga.findFirst({
          where: {
            mangaId,
          },
        });
        if (!manga) {
          const newManga = await createManga(mangaId);
        }
        await prisma.userManga.create({
          data: {
            userId: user.id,
            mangaId,
            isFavorited: isFavorite,
            isWatchlisted: isWatchlist,
          },
        });
        break;
      }
      await prisma.userManga.updateMany({
        where: {
          userId: user.id,
          mangaId,
        },
        data: {
          isFavorited: isFavorite,
          isWatchlisted: isWatchlist,
        },
      });
      break;
    case Actions.ResetProgression:
      await prisma.userManga.updateMany({
        where: {
          userId: user.id,
          mangaId,
        },
        data: {
          progress: "{}",
          finished: false,
        },
      });
      break;
    case Actions.EditHistory:
      const newProgress = data.get("progress") as string;
      await prisma.userManga.updateMany({
        where: {
          userId: user.id,
          mangaId,
        },
        data: {
          progress: newProgress,
        },
      });
      break;
    case Actions.SetRating:
      const rating = parseInt(data.get("rating") as string);
      const isCrushed = (data.get("isCrushed") as string) === "1";
      const UserManga = await prisma.userManga.findFirst({
        where: {
          userId: user.id,
          mangaId,
        },
        select: {
          id: true,
          manga: {
            select: {
              id: true,
            },
          },
        },
      });
      const newData = isNaN(rating) ? { isCrushed } : { rating };
      if (!UserManga) {
        const manga = await prisma.manga.findFirst({
          where: {
            mangaId,
          },
        });
        if (!manga) {
          const newManga = await createManga(mangaId);
        }
        await prisma.userManga.create({
          data: {
            userId: user.id,
            mangaId,
            ...newData,
          },
        });
        break;
      }
      await prisma.userManga.updateMany({
        where: {
          userId: user.id,
          mangaId,
        },
        data: {
          ...newData,
        },
      });
      break;
  }
  return null;
};

enum Actions {
  SetSettings = "setSettings",
  ResetProgression = "resetProgression",
  EditHistory = "editHistory",
  SetRating = "setRating",
}
const toggleGroupActions = [
  {
    value: "favorite",
    description: "Ajouter aux favoris",
    icon: <Star />,
  },
  {
    value: "watchlist",
    description: "Ajouter à la liste de lecture",
    icon: <ClockArrowUp />,
  },
  {
    value: "history",
    description: "Historique de lecture",
    icon: <History />,
    isProgression: true,
  },
  {
    value: "restart",
    description: "Recommencer la lecture",
    icon: <RotateCcw />,
    isProgression: true,
  },
];

export default function MangaDetails() {
  const data: {
    isLoggedIn: boolean;
    id: string;
    synopsis: string;
    tags: string[];
    title: string;
    coverImg: string;
    alternateNames: string[];
    userManga: UserManga;
    chaptersAmount: number;
    chaptersDetails: {
      number: number;
      pagesAmount: number;
    }[];
    avgRating: number;
  } = useLoaderData();
  const revalidator = useRevalidator();
  const [chaptersSearch, setChaptersSearch] = useState("");
  const [altTitlesOpen, setAltTitlesOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(
    data.userManga && data.userManga.isFavorited
  );
  const [isWatchlist, setIsWatchlist] = useState(
    data.userManga && data.userManga.isWatchlisted
  );
  const [rating, setRating] = useState(data.userManga?.rating || 0);
  const [isCrushed, setIsCrushed] = useState(
    data.userManga?.isCrushed || false
  );
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const isFinished = data.userManga?.finished;
  const timesFinished = data.userManga?.timesFinished;
  const progress = JSON.parse(data.userManga?.progress || "{}");
  const [restartDialogOpen, setRestartDialogOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 640px)");
  const navigate = useNavigate();

  useEffect(() => {
    if (data.userManga) {
      setIsFavorite(data.userManga.isFavorited);
      setIsWatchlist(data.userManga.isWatchlisted);
      setRating(data.userManga.rating || 0);
      setIsCrushed(data.userManga.isCrushed || false);
    }
  }, []);

  const [toggleGroupValue, setToggleGroupValue] = useState(
    data.userManga
      ? [
          data.userManga.isFavorited ? "favorite" : "",
          data.userManga.isWatchlisted ? "watchlist" : "",
        ]
      : [].filter((i) => i)
  );
  async function toggleGroupChange(valArray: string[]) {
    const fav = valArray.includes("favorite");
    const watchlist = valArray.includes("watchlist");
    if (
      (valArray.includes("favorite") && !isFavorite) ||
      (!valArray.includes("favorite") && isFavorite) ||
      (valArray.includes("watchlist") && !isWatchlist) ||
      (!valArray.includes("watchlist") && isWatchlist)
    ) {
      const res = await submit(`/manga/${data.id}`, {
        action: Actions.SetSettings,
        id: data.id,
        isFavorite: fav ? "1" : "0",
        isWatchlist: watchlist ? "1" : "0",
      });
      if (res.status === 200) {
        setIsFavorite(fav);
        setIsWatchlist(watchlist);
      } else return;
    }
    if (valArray.includes("restart")) {
      setRestartDialogOpen(true);
    }
    if (valArray.includes("history")) {
      setIsHistoryOpen(true);
    }
    setToggleGroupValue([
      ...(fav ? ["favorite"] : []),
      ...(watchlist ? ["watchlist"] : []),
    ]);
  }
  async function reset(redirect: boolean = false) {
    const res = await submit(`/manga/${data.id}`, {
      action: Actions.ResetProgression,
      id: data.id,
    });
    if (res.status === 200) {
      setRestartDialogOpen(false);
      if (redirect) {
        navigate(`/read/${data.id}/1`);
      }
    }
  }

  const [newProgress, setNewProgress] = useState(progress);

  async function onHistoryEditSubmit() {
    await submit(`/manga/${data.id}`, {
      action: Actions.EditHistory,
      progress: JSON.stringify(newProgress),
      id: data.id,
    });
    setIsHistoryOpen(false);
  }

  async function updateRating(newRating: number) {
    setRating(newRating);
    const res = await submit(`/manga/${data.id}`, {
      action: Actions.SetRating,
      id: data.id,
      rating: newRating.toString(),
    });
  }
  async function updateCrushed() {
    setIsCrushed(!isCrushed);
    const res = await submit(`/manga/${data.id}`, {
      action: Actions.SetRating,
      id: data.id,
      isCrushed: !isCrushed ? "1" : "0",
    });
  }

  const colorData = useColor(data.coverImg, "hex", {
    crossOrigin: "anonymous",
  });
  const mainColor = colorData.data || "#ffffff00";
  const [similarMangas, setSimilarMangas] = useState([]);
  useEffect(() => {
    const getSimilarMangas = async () => {
      const res = await submit("/api/recommendbytags", {
        tags: data.tags.join(","),
        mangaId: data.id,
      });
      const resData = await res.json();
      if (res.status !== 200) return;
      setSimilarMangas(resData);
    };
    getSimilarMangas();
  }, []);
  return (
    <>
      <div className="flex justify-center w-[100vw] mt-10">
        <div className="w-full lg:w-1/2 3xl:w-1/3 lg:-ml-36">
          <div className="flex gap-2 flex-col lg:flex-row mx-4 lg:mx-0">
            <img
              src={data.coverImg}
              alt={data.title}
              className="rounded-lg object-cover transition-all duration-500 ease-in-out"
              style={{
                boxShadow: `0 0 60px ${mainColor}`,
              }}
            />
            <ToggleGroup
              type="multiple"
              orientation={isMobile ? "horizontal" : "vertical"}
              className="flex justify-center lg:flex-col lg:justify-between gap-1"
              value={toggleGroupValue}
              onValueChange={toggleGroupChange}
            >
              <TooltipProvider>
                {toggleGroupActions.map((action) => (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        key={action.value}
                        value={action.value}
                        className="p-8 w-full lg:w-unset  lg:p-8 lg:h-full"
                        style={{
                          background: toggleGroupValue.includes(action.value)
                            ? "#e8e8e8"
                            : "",
                        }}
                        disabled={
                          action.isProgression &&
                          !(data.userManga && data.userManga.progress !== "{}")
                        }
                      >
                        {action.icon}
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="p-2">
                      {action.description}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </ToggleGroup>
          </div>
          <div className="flex flex-col-reverse lg:flex-col">
            <Collapsible
              open={altTitlesOpen}
              onOpenChange={setAltTitlesOpen}
              className="mx-4 lg:mx-0 lg:mt-4"
            >
              <div className="flex gap-2">
                <h1 className="text-4xl font-bold">{data.title}</h1>{" "}
                {data.alternateNames && data.alternateNames.length > 0 && (
                  <CollapsibleTrigger>
                    <Button variant="ghost" asChild>
                      <ChevronsUpDown />
                    </Button>
                  </CollapsibleTrigger>
                )}
              </div>
              <CollapsibleContent className="mb-3 mt-1.5">
                <h4 className="text-lg font-bold">Autres titres</h4>
                <ul>
                  {data.alternateNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              </CollapsibleContent>
            </Collapsible>
            <div className="pt-3 flex flex-col lg:flex-row lg:-mt-1 mb-3 gap-2 mx-4 lg:mx-0">
              {data.userManga && data.userManga.finished && (
                <Button onClick={() => setRestartDialogOpen(true)}>
                  Recommencer le manga
                </Button>
              )}
              {data.userManga && data.userManga.progress !== "{}" ? (
                <Link to={`/read/${data.id}/latest`}>
                  <Button variant="outline" className="w-full lg:w-unset">
                    Reprendre la lecture
                  </Button>
                </Link>
              ) : (
                <Link to={`/read/${data.id}/1`}>
                  <Button>Commencer la lecture</Button>
                </Link>
              )}
            </div>
          </div>
          <div className="mx-4 lg:mx-0 mt-1 mb-2">
            <h3 className="text-lg font-bold">Note</h3>
            <div className="flex items-center gap-2">
              <Rating
                rating={data.isLoggedIn ? rating : data.avgRating}
                setRating={updateRating}
                disabled={!data.isLoggedIn}
              />{" "}
              {data.avgRating && !isNaN(data.avgRating) && (
                <span className="text-lg">{data.avgRating.toFixed(1)}</span>
              )}
              {data.isLoggedIn && (
                <Heart
                  className={`cursor-pointer ml-2 ${
                    isCrushed
                      ? "fill-primary"
                      : "fill-muted stroke-muted-foreground"
                  }`}
                  onClick={updateCrushed}
                />
              )}
            </div>
          </div>
          <div className="mx-4 lg:mx-0">
            <h3 className="text-lg font-bold">Résumé</h3>
            <p className="mt-1">{data.synopsis}</p>

            {data.userManga && (
              <span className="italic text-gray-400 mt-1">
                {!data.userManga.finished &&
                  data.userManga.startedAt &&
                  ![undefined, null, "{}"].includes(
                    data.userManga.progress
                  ) && (
                    <p>
                      Commencé{" "}
                      <span
                        title={formatRelative(
                          new Date(data.userManga.startedAt),
                          new Date(),
                          { locale: fr }
                        )}
                      >
                        {formatDistance(
                          new Date(data.userManga.startedAt),
                          new Date(),
                          { locale: fr, addSuffix: true }
                        )}
                      </span>
                    </p>
                  )}
                {data.userManga.timesFinished > 0 && (
                  <p>Lu {timesFinished} fois</p>
                )}
              </span>
            )}
          </div>
          {data.tags.length > 0 && (
            <Carousel className="mt-3 select-none mx-4 lg:mx-0">
              <CarouselContent className="">
                {data.tags.map((tag) => (
                  <CarouselItem className="basis-1/8">
                    <Link to={`/?tags=${tag}#search`}>
                      <Badge variant="outline">{tag}</Badge>
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious /> <CarouselNext />
            </Carousel>
          )}
          {similarMangas && similarMangas.length > 0 && (
            <>
              <h3 className="text-lg font-bold">Mangas similaires</h3>
              <Carousel className="mt-3 mx-4 lg:mx-0">
                <CarouselContent>
                  {similarMangas.map((manga: IndexManga) => (
                    <CarouselItem
                      key={manga.id}
                      className="basis-1/2 md:basis-1/3 lg:basis-1/4"
                    >
                      <Link to={`/manga/${manga.id}`}>
                        <div className="flex flex-col gap-1">
                          <img
                            src={manga.img}
                            alt={manga.title}
                            className="rounded-lg object-cover"
                          />
                          <span className="text-sm">{manga.title}</span>
                        </div>
                      </Link>
                    </CarouselItem>
                  ))}
                </CarouselContent>{" "}
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </>
          )}
          <div className="w-full rounded-lg py-2 mt-5 px-4 lg:px-0">
            <Input
              value={chaptersSearch}
              onChange={(e) => setChaptersSearch(e.target.value)}
              placeholder="Rechercher un chapitre..."
              className="shadow-none border-gray-100"
            />
            <div className="flex justify-center items-center border-gray-100 border rounded-lg h-24 mt-2">
              <span className="text-gray-400 italic">Coming soon...</span>
            </div>
            {/*<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-1 gap-y-1 mt-2">
              {Array(data.chaptersAmount)
                .fill(0)
                .filter((_, i) =>
                  normalizeString(`Chapitre ${i + 1}`).includes(
                    normalizeString(chaptersSearch)
                  )
                )
                .map((_, t) => {
                  const details = data.chaptersDetails.find(
                    (chap) => chap.number === t + 1
                  );
                  let pagesAmount;
                  if (details) {
                    pagesAmount = details.pagesAmount;
                  }
                  return (
                    <Link
                      to={`/read/${data.id}/${t + 1}`}
                      key={t + 1}
                      className="p-2 border border-gray-100 rounded-md flex flex-col"
                    >
                      <span>Chapitre {t + 1}</span>
                      {pagesAmount && (
                        <span className="text-sm text-gray-600">
                          {pagesAmount} page{pagesAmount !== 1 && "s"}
                        </span>
                      )}
                    </Link>
                  );
                })

            </div>*/}
          </div>
        </div>
        <ResponsiveDialog
          submitText={"Enregister"}
          onSubmit={onHistoryEditSubmit}
          open={isHistoryOpen}
          setOpen={setIsHistoryOpen}
          title={"Modifier l'historique de lecture"}
          onCancel={() => {
            setNewProgress(progress);
          }}
        >
          <div className="flex flex-col gap-1.5 max-h-[75vh] overflow-y-auto">
            {Object.entries(newProgress).length > 0 ? (
              Object.entries(newProgress).map((chapter) => {
                const chapterNum = chapter[0];
                const { currentPage, totalPage } = chapter[1];
                return (
                  <div
                    key={chapterNum}
                    className="rounded-lg px-3 py-2 flex justify-between items-center border border-gray-100 shadow-md"
                  >
                    <div className="flex flex-col">
                      <span className="text-lg">Chapitre {chapterNum}</span>
                      <span className="">Page {currentPage}</span>
                    </div>
                    <Button
                      variant="ghost"
                      className="h-full"
                      onClick={() => {
                        const prog = newProgress;
                        delete prog[chapterNum];
                        // spread the object so react rerenders the component
                        setNewProgress({ ...prog });
                      }}
                    >
                      <X className="text-red-500" />
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="rounded-lg px-3 py-2 flex justify-between items-center border border-gray-100 shadow-md text-gray-600">
                Vide
              </p>
            )}
          </div>
        </ResponsiveDialog>
        <ResponsiveDialog
          danger
          description=""
          submitText="Recommencer"
          onSubmit={() => reset(true)}
          title="Recommencer le manga"
          open={restartDialogOpen}
          setOpen={setRestartDialogOpen}
        >
          <p>
            Êtes-vous sur de vouloir recommencer ce manga à partir du début ?
          </p>
        </ResponsiveDialog>
      </div>
    </>
  );
}
