import { ActionFunction, LoaderFunction } from "@remix-run/node";
import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ClockArrowUp, Home, Star } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { getUser } from "~/session.server";
import { prisma } from "~/db.server";
import { submit } from "~/utils";
import { useEffect, useState } from "react";
import useDebounce from "~/hooks/useDebounce";

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getUser(request);
  let isFavorited = false;
  let isWatchlisted = false;
  let page = null;
  if (!params.name || !params.chapter)
    return new Response(null, { status: 400 });
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
      page = JSON.parse(progressData?.progress)[params.chapter].currentPage;
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
    console.log("done");
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
      const oldProgress = JSON.parse(data.get("progress") as string) as {
        [chapterNumber: string]: {
          currentPage: number;
          totalPages: number;
        };
      };
      const newProgress = {
        ...oldProgress,
        [progress.chapter]: {
          currentPage: progress.page,
          totalPages: progress.totalPages,
        },
      };
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
    console.log("Saved progress");
    return new Response(null, { status: 200 });
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
  console.log("Debounced val: " + debouncedCenterElId);

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
  return (
    <div className="flex justify-center">
      <div className="w-1/2">
        <Select onValueChange={(val) => navigate(val)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={"Chapitre " + data.chapterNumber} />
          </SelectTrigger>
          <SelectContent>
            {Array(data.chaptersAmount)
              .fill(0)
              .map((_, i) => (
                <SelectItem key={i} value={`/read/${data.mangaName}/${i + 1}`}>
                  Chapter {i + 1}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {data.isConnected && (
          <div className="fixed top-2 left-3 border border-gray-200 rounded-md backdrop-blur-sm p-1">
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
              <ToggleGroupItem value="favorite">
                <Star />
              </ToggleGroupItem>
              <ToggleGroupItem value="watchlist">
                <ClockArrowUp />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}

        <div className="flex flex-col">
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
    </div>
  );
}
