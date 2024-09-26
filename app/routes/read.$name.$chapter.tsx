import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ArrowLeft, ArrowRight, ClockArrowUp, Home, Star } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { getUser } from "~/session.server";
import { prisma } from "~/db.server";
import { submit } from "~/utils";
import { useEffect, useState } from "react";
import useDebounce from "~/hooks/useDebounce";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getUser(request);
  let isFavorited = false;
  let isWatchlisted = false;
  let page = null;
  if (!params.name || !params.chapter)
    return new Response(null, { status: 400 });
  if (params.chapter === "latest" && !user) {
    return redirect(`/read/${params.name}/1`);
  } else if (params.chapter === "latest" && user) {
    const progressData = await prisma.mangaProgression.findFirst({
      where: {
        userId: user.id,
        mangaId: params.name,
      },
    });
    if (progressData) {
      const progress = JSON.parse(progressData.progress);
      const latestChapter = Object.keys(progress).sort((a, b) => b - a)[0];
      return redirect(`/read/${params.name}/${latestChapter}`);
    }
  }
  if (user) {
    isFavorited = !!(await prisma.favoritedManga.findFirst({
      where: {
        userId: user.id,
        mangaId: params.name,
      },
    }));
    isWatchlisted = !!(await prisma.watchlistedManga.findFirst({
      where: {
        userId: user.id,
        mangaId: params.name,
      },
    }));
    const progressData = await prisma.mangaProgression.findFirst({
      where: {
        userId: user?.id,
        mangaId: params.name,
      },
    });
    if (progressData) {
      const pageData = JSON.parse(progressData?.progress)[params.chapter];
      if (pageData) {
        page = pageData.currentPage;
      }
    }
  }
  // get chapters amount
  const res = await fetch(
    `https://anime-sama.fr/catalogue/${params.name}/scan/vf/episodes.js`
  );
  const text = await res.text();
  const chapters = text.match(/eps[0-9]+=/gm);
  const chaptersAmount = chapters?.length;
  const pagesAmount =
    text.split(`var eps${params.chapter}= [`)[1].split("];")[0].split(",")
      .length - 1;
  // get manga real name
  const mainPageRes = await fetch(
    `https://anime-sama.fr/catalogue/${params.name}/scan/vf/`
  );
  const mainPageText = await mainPageRes.text();
  const prettyMangaName = mainPageText
    .match(/<h3 id="titreOeuvre".+>(.+)<\/h3>/gm)[0]
    .split(">")[1]
    .split("<")[0];
  return {
    chaptersAmount,
    mangaName: params.name,
    chapterNumber: params.chapter,
    pagesAmount,
    prettyMangaName,
    isFavorited,
    isWatchlisted,
    isConnected: !!user,
    page,
  };
};

enum Action {
  SetOptions = "setOptions",
  SetProgress = "setProgress",
  FinishManga = "finishManga"
}

export const action: ActionFunction = async ({ request, params }) => {
  const user = await getUser(request);
  if (!user) return new Response(null, { status: 401 });
  const data = await request.formData();
  const action = data.get("action");
  if (!params.name) return new Response(null, { status: 400 });
  if (action === Action.SetOptions) {
    const isFavorited = data.get("isFavorited") === "true";
    const isWatchlisted = data.get("isWatchlisted") === "true";
    const currentlyFavorited = data.get("currentlyFavorited") === "true";
    const currentlyWatchlisted = data.get("currentlyWatchlisted") === "true";
    if (isFavorited && !currentlyFavorited) {
      await prisma.favoritedManga.create({
        data: {
          userId: user.id,
          mangaId: params.name,
        },
      });
    } else if (!isFavorited && currentlyFavorited) {
      await prisma.favoritedManga.deleteMany({
        where: {
          userId: user.id,
          mangaId: params.name,
        },
      });
    }
    if (isWatchlisted && !currentlyWatchlisted) {
      await prisma.watchlistedManga.create({
        data: {
          userId: user.id,
          mangaId: params.name,
        },
      });
    } else if (!isWatchlisted && currentlyWatchlisted) {
      await prisma.watchlistedManga.deleteMany({
        where: {
          userId: user.id,
          mangaId: params.name,
        },
      });
    }
    return new Response(null, { status: 200 });
  } else if (action === Action.SetProgress) {
    const progress = JSON.parse(data.get("progress") as string) as {
      page: number;
      totalPages: number;
      chapter: number;
    };
    if (!progress) return new Response(null, { status: 400 });
    const progressData = await prisma.mangaProgression.findFirst({
      where: {
        userId: user.id,
        mangaId: params.name,
      },
    });
    if (progressData) {
      const oldProgress = JSON.parse(progressData.progress);
      const newProgress = {
        ...oldProgress,
        [progress.chapter]: {
          currentPage: progress.page,
          totalPages: progress.totalPages,
        },
      };
      console.log(
        "Saving progress for manga " +
          params.name +
          " (chapter " +
          progress.chapter +
          ")"
      );
      await prisma.mangaProgression.update({
        where: {
          id: progressData.id,
        },
        data: {
          progress: JSON.stringify(newProgress),
          finished: false,
        },
      });
    } else {
      await prisma.mangaProgression.create({
        data: {
          userId: user.id,
          mangaId: params.name,
          progress: JSON.stringify({
            [progress.chapter]: {
              currentPage: progress.page,
              totalPages: progress.totalPages,
            },
          }),
          finished: false,
        },
      });
    }
    return new Response(null, { status: 200 });
  } else if (action === Action.FinishManga) {
    const progressData = await prisma.mangaProgression.findFirst({
      where: {
        userId: user.id,
        mangaId: params.name,
      },
    });
    if (progressData) {
      if (progressData.finished) return new Response(null, { status: 200 });
      await prisma.mangaProgression.update({
        where: {
          id: progressData.id,
        },
        data: {
          finished: true,
          progress: JSON.stringify({
            ...JSON.parse(progressData.progress),
            [params.chapter]: {
              currentPage: JSON.parse(progressData.progress)[params.chapter].totalPages,
              totalPages: JSON.parse(progressData.progress)[params.chapter].totalPages
            }
          }),
          timesFinished: {
            increment: 1,
          }
        },
      });
    }
  }
  return new Response(null, { status: 200 });
};

export default function Read() {
  const data: {
    chaptersAmount: number;
    mangaName: string;
    chapterNumber: string;
    pagesAmount: number;
    prettyMangaName: string;
    isFavorited: boolean;
    isWatchlisted: boolean;
    isConnected: boolean;
    page?: number;
  } = useLoaderData();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();

  async function toggleOption(options: string[]) {
    if (options.includes("home")) {
      navigate("/");
      return;
    }
    const res = await submit(`/read/${data.mangaName}/${data.chapterNumber}`, {
      action: Action.SetOptions,
      isFavorited: options.includes("favorite") ? "true" : "false",
      isWatchlisted: options.includes("watchlist") ? "true" : "false",
      currentlyFavorited: data.isFavorited ? "true" : "false",
      currentlyWatchlisted: data.isWatchlisted ? "true" : "false",
    });
    if (res.ok) {
      revalidate();
    }
  }

  async function saveProgress(elId: string) {
    if (!elId || !elId.includes("page-")) return;
    const page = parseInt(elId.split("-")[1]);
    const totalPages = data.pagesAmount;
    const chapter = parseInt(data.chapterNumber);
    await submit(`/read/${data.mangaName}/${data.chapterNumber}`, {
      action: Action.SetProgress,
      progress: JSON.stringify({ page, totalPages, chapter }),
    });
  }

  const [centerElement, setCenterElement] = useState(null);
  const debouncedCenterElId = useDebounce(
    centerElement?.id,
    5000,
    saveProgress
  );

  useEffect(() => {
    const detectCenterElement = () => {
      const elements = document.elementsFromPoint(
        window.innerWidth / 2,
        window.innerHeight / 2
      );
      if (elements && elements.length > 0) {
        setCenterElement(elements[0]);
      }
    };

    // Detect on load
    detectCenterElement();

    // Event listeners for scroll and resize
    window.addEventListener("scroll", detectCenterElement);
    window.addEventListener("resize", detectCenterElement);

    // Cleanup function
    return () => {
      window.removeEventListener("scroll", detectCenterElement);
      window.removeEventListener("resize", detectCenterElement);
    };
  }, []); // Empty dependency array ensures the effect runs only once after the initial render
  useEffect(() => {
    if (data.page) {
      const el = document.getElementById(`page-${data.page}`);
      if (el) {
        el.scrollIntoView();
      }
      console.log("Scrolled to page " + data.page);
    }
  }, []);
  async function finish () {
    if (data.isConnected) {
      await submit(`/read/${data.mangaName}/${data.chapterNumber}`, {
        action: Action.FinishManga
      }
      )
    }
      navigate("/")
  }
    
  return (
    <div className="flex flex-col justify-center pt-[180px]">
      <div className="fixed lg:top-2 lg:left-3 top-0 left-0 w-[100vw] lg:w-[unset] border border-gray-200 rounded-md backdrop-blur-3xl p-1 flex flex-col gap-1">
        <ToggleGroup
          onValueChange={toggleOption}
          variant="default"
          type="multiple"
          defaultValue={[
            ...(data.isFavorited ? ["favorite"] : []),
            ...(data.isWatchlisted ? ["watchlist"] : []),
          ]}
        >
          <ToggleGroupItem value="home">
            <Home />
          </ToggleGroupItem>
          {data.isConnected && (
            <>
              <ToggleGroupItem value="favorite">
                <Star />
              </ToggleGroupItem>
              <ToggleGroupItem value="watchlist">
                <ClockArrowUp />
              </ToggleGroupItem>
            </>
          )}
        </ToggleGroup>
        <Separator />
        <ToggleGroup
          type="single"
          onValueChange={(vals) => {
            if (vals.includes("previous")) {
              navigate(
                `/read/${data.mangaName}/${parseInt(data.chapterNumber) - 1}`
              );
            } else if (vals.includes("next")) {
              navigate(
                `/read/${data.mangaName}/${parseInt(data.chapterNumber) + 1}`
              );
            }
          }}
          value={[]}
        >
          <ToggleGroupItem
            value="previous"
            className="w-full"
            disabled={parseInt(data.chapterNumber) <= 1}
          >
            <ArrowLeft />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="next"
            className="w-full"
            disabled={parseInt(data.chapterNumber) >= data.chaptersAmount}
          >
            <ArrowRight />
          </ToggleGroupItem>
        </ToggleGroup>
        <Separator />
        <Select onValueChange={(val) => navigate(val)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={"Chapitre " + data.chapterNumber} />
          </SelectTrigger>
          <SelectContent>
            {Array(data.chaptersAmount)
              .fill(0)
              .map((_, i) => (
                <SelectItem key={i} value={`/read/${data.mangaName}/${i + 1}`}>
                  Chapitre {i + 1}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full px-2 lg:px-0 lg:flex justify-center">
        <div className="flex flex-col lg:w-1/2">
          {Array(data.pagesAmount)
            .fill(0)
            .map((_, i) => (
              <img
                key={i}
                src={`https://anime-sama.fr/s2/scans/${data.prettyMangaName}/${
                  data.chapterNumber
                }/${i + 1}.jpg`}
                id={`page-${i}`}
              />
            ))}
        </div>
      </div>
      <div className="justify-center flex">
        <div className="flex gap-2 justify-center my-4 w-full lg:w-1/2 mx-3 lg:mx-0">
          {(parseInt(data.chapterNumber) < data.chaptersAmount) ? (
            <>
            
            <Button
              disabled={parseInt(data.chapterNumber) <= 1}
              onClick={() =>
                navigate(
                  `/read/${data.mangaName}/${parseInt(data.chapterNumber) - 1}`
                )
              }
              className={parseInt(data.chapterNumber) > 1 ? "w-full" : ""}
            >
              Précédent
            </Button>
            <Button
              disabled={parseInt(data.chapterNumber) >= data.chaptersAmount}
              onClick={() =>
                navigate(
                  `/read/${data.mangaName}/${parseInt(data.chapterNumber) + 1}`
                )
              }
              className={
                parseInt(data.chapterNumber) < data.chaptersAmount ? "w-full" : ""
              }
            >
              Suivant
            </Button></>
          ) : (
            <Button onClick={finish} className="w-full">Terminer</Button>
          )}
        </div>
      </div>
    </div>
  );
}
