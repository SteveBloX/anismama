import {
  ActionFunction,
  json,
  LinksFunction,
  LoaderFunction,
  MetaFunction,
  redirect,
} from "@remix-run/node";
import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpToLine,
  BookText,
  ClockArrowUp,
  Ellipsis,
  Eye,
  EyeOff,
  Home,
  List,
  PanelLeft,
  PanelRight,
  PanelTop,
  Settings,
  Star,
} from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { getUser } from "~/session.server";
import { prisma } from "~/db.server";
import { getLastChapterFromProgress, submit } from "~/utils";
import { useEffect, useState } from "react";
import useDebounce from "~/hooks/useDebounce";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { ResponsiveDialog } from "~/components/reponsive-dialog";
import { Checkbox } from "~/components/ui/checkbox";
import { Slider } from "~/components/ui/slider";
import createManga from "~/createManga";
import useProvider, { Providers } from "~/providers/lib";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import AnimatedStats from "~/components/stats";
import { intervalToDuration } from "date-fns";
import { MangaChapters } from "~/types";
import { useMediaQuery } from "~/hooks/use-media-query";
import { useToast } from "~/hooks/use-toast";
import { Toaster } from "~/components/ui/toaster";
import { ToastAction } from "~/components/ui/toast";

export const meta: MetaFunction = ({ data }: { data: any }) => {
  if (!data) return [];
  return [
    {
      title:
        "Anismama | " +
        data.prettyMangaName +
        " - Chapitre " +
        data.chapterNumber,
    },
  ];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  console.log("Loading manga: " + params.name);
  const user = await getUser(request);
  let isFavorited = false;
  let isWatchlisted = false;
  let progress = {};
  let page = null;
  if (!params.name || !params.chapter)
    return new Response(null, { status: 400 });
  let userManga;
  if (user) {
    console.log("Getting user manga");
    userManga = await prisma.userManga.findFirst({
      where: {
        userId: user.id,
        mangaId: params.name,
      },
      include: {
        manga: true,
      },
    });
  }
  const manga = userManga
    ? userManga.manga
    : await prisma.manga.findFirst({
        where: {
          mangaId: params.name,
        },
      });
  let prettyMangaName;
  let data;
  if (manga) {
    console.log("Getting manga data");
    prettyMangaName = manga.title;
    const mangaProvider = useProvider(manga.provider as Providers);
    const chaptersData = await mangaProvider.getManga(params.name, {
      chapters: true,
    });
    data = {
      chaptersAmount: chaptersData.chaptersAmount,
      chaptersDetails: chaptersData.chaptersDetails,
    };
  } else {
    console.log("Creating manga");
    const mangaData = await createManga(params.name);
    data = {
      ...mangaData,
      chaptersDetails: mangaData.chaptersDetails,
    };
    prettyMangaName = data.title;
    if (user && !userManga) {
      await prisma.userManga.create({
        data: {
          userId: user.id,
          mangaId: params.name,
        },
      });
    }
  }

  if (userManga) {
    isFavorited = userManga.isFavorited;
    isWatchlisted = userManga.isWatchlisted;
    progress = userManga.progress;
    const pageData = JSON.parse(userManga?.progress)[params.chapter];
    if (pageData) {
      page = pageData.currentPage;
    }
  }
  return json({
    mangaName: params.name,
    chapterNumber: params.chapter,
    prettyMangaName,
    ...data,
    isFavorited,
    isWatchlisted,
    isConnected: !!user,
    page,
    provider: manga?.provider || Providers.animeSama,
    startedAt: userManga?.startedAt,
    progress,
  });
};

enum Action {
  SetOptions = "setOptions",
  SetProgress = "setProgress",
  FinishManga = "finishManga",
}

export function shouldRevalidate() {
  return false;
}

export const action: ActionFunction = async ({ request, params }) => {
  const user = await getUser(request);
  if (!user) return new Response(null, { status: 401 });
  const data = await request.formData();
  const action = data.get("action");
  if (!params.name) return new Response(null, { status: 400 });
  let userManga = await prisma.userManga.findFirst({
    where: {
      userId: user.id,
      mangaId: params.name,
    },
  });
  if (!userManga) {
    const manga = await prisma.manga.findFirst({
      where: {
        mangaId: params.name,
      },
    });
    if (!manga) {
      await createManga(params.name);
    }
    userManga = await prisma.userManga.create({
      data: {
        userId: user.id,
        mangaId: params.name,
      },
    });
  }
  if (action === Action.SetOptions) {
    const isFavorited = data.get("isFavorited") === "true";
    const isWatchlisted = data.get("isWatchlisted") === "true";
    await prisma.userManga.update({
      where: {
        id: userManga.id,
      },
      data: {
        isFavorited,
        isWatchlisted,
      },
    });

    return new Response(JSON.stringify({ isFavorited, isWatchlisted }), {
      status: 200,
    });
  } else if (action === Action.SetProgress) {
    const progress = JSON.parse(data.get("progress") as string) as {
      page: number;
      totalPages: number;
      chapter: number;
    };
    if (!progress) return new Response(null, { status: 400 });
    const progressData = userManga.progress;
    if (progressData) {
      const oldProgress = JSON.parse(progressData);
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
      await prisma.userManga.update({
        where: {
          id: userManga.id,
        },
        data: {
          ...([null, undefined, "{}"].includes(progressData) ||
          !userManga.startedAt
            ? {
                startedAt: new Date(),
              }
            : {}),
          lastReadAt: new Date(),
          progress: JSON.stringify(newProgress),
        },
      });
    }
    return new Response(null, { status: 200 });
  } else if (action === Action.FinishManga) {
    if (userManga.finished) return new Response(null, { status: 200 });
    console.log("finish");
    await prisma.userManga.update({
      where: {
        id: userManga.id,
      },
      data: {
        startedAt: new Date(),
        finished: true,
        progress: JSON.stringify({
          ...JSON.parse(userManga.progress),
          [params.chapter]: {
            currentPage: JSON.parse(userManga.progress)[params.chapter]
              .totalPages,
            totalPages: JSON.parse(userManga.progress)[params.chapter]
              .totalPages,
          },
        }),
        timesFinished: {
          increment: 1,
        },
        isWatchlisted: false,
      },
    });
  }
  return new Response(null, { status: 200 });
};

enum FloaterSide {
  Left = "LEFT",
  Right = "RIGHT",
  Top = "TOP",
}

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
    provider: Providers;
    startedAt?: Date;
    chaptersDetails: MangaChapters["chaptersDetails"];
    progress: string;
  } = useLoaderData();
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const [options, setOptions] = useState([
    ...(data.isFavorited ? ["favorite"] : []),
    ...(data.isWatchlisted ? ["watchlist"] : []),
  ]);
  const mangaProvider = useProvider(data.provider);
  const [isFavorited, setIsFavorited] = useState(data.isFavorited);
  const [isWatchlisted, setIsWatchlisted] = useState(data.isWatchlisted);
  const [currentChapter, setCurrentChapter] = useState(
    parseInt(data.chapterNumber)
  );
  useEffect(() => {
    if (data.page) {
      setCurrentChapter(parseInt(data.chapterNumber));
    }
  }, []);
  const isMobile = useMediaQuery("(max-width: 640px)");

  async function toggleOption(options: string[]) {
    const excluded = ["more", "home", "settings"];
    if (options.includes("home")) {
      navigate("/");
      return;
    }
    if (options.includes("settings")) {
      setSettingsDialogOpen(true);
    }
    if (options.includes("details")) {
      navigate(`/manga/${data.mangaName}`);
    }
    if (
      (options.includes("favorite") && !isFavorited) ||
      (options.includes("watchlist") && !isWatchlisted) ||
      (!options.includes("favorite") && isFavorited) ||
      (!options.includes("watchlist") && isWatchlisted)
    ) {
      const res = await submit(`/read/${data.mangaName}/${currentChapter}`, {
        action: Action.SetOptions,
        isFavorited: options.includes("favorite") ? "true" : "false",
        isWatchlisted: options.includes("watchlist") ? "true" : "false",
        currentlyFavorited: isFavorited ? "true" : "false",
        currentlyWatchlisted: isWatchlisted ? "true" : "false",
      });
      if (res.status === 200) {
        setIsFavorited(options.includes("favorite"));
        setIsWatchlisted(options.includes("watchlist"));
      }
    }
    setOptions(options.filter((option) => !excluded.includes(option)));
  }

  async function saveProgress(elId: string, keepAlive: boolean = false) {
    if (!elId || !elId.includes("page-")) return;
    const page = parseInt(elId.split("-")[1]);
    const totalPages = data.chaptersDetails.find(
      (c) => c.number === currentChapter
    );
    const chapter = currentChapter;
    await submit(
      `/read/${data.mangaName}/${currentChapter}`,
      {
        action: Action.SetProgress,
        progress: JSON.stringify({ page, totalPages, chapter }),
      },
      keepAlive
    );
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

    function saveBeforeExit() {
      const element = document.elementsFromPoint(
        window.innerWidth / 2,
        window.innerHeight / 2
      )[0];
      saveProgress(element.id, true);
    }

    // Event listeners for scroll and resize
    window.addEventListener("scroll", detectCenterElement);
    window.addEventListener("resize", detectCenterElement);
    window.addEventListener("beforeunload", saveBeforeExit);

    // Cleanup function
    return () => {
      window.removeEventListener("scroll", detectCenterElement);
      window.removeEventListener("resize", detectCenterElement);
      window.removeEventListener("beforeunload", saveBeforeExit);
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

  async function finish() {
    if (data.isConnected) {
      await submit(`/read/${data.mangaName}/${currentChapter}`, {
        action: Action.FinishManga,
      });
    }
    navigate(`/manga/${data.mangaName}`);
  }

  const [invertedControls, setInvertedControls] = useState(false);
  const [marginBottom, setMarginBottom] = useState(0);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [floaterSide, setFloaterSide] = useState<FloaterSide>(FloaterSide.Left);
  const [floaterSize, setFloaterSize] = useState<"default" | "sm" | "lg">(
    "default"
  );
  useEffect(() => {
    const dataJson = localStorage.getItem("settings");
    if (!dataJson || dataJson === "") return;
    const data = JSON.parse(dataJson);
    setSettingsSaved(true);
    if (data.marginBottom) setMarginBottom(data.marginBottom);
    if (data.invertedControls) setInvertedControls(data.invertedControls);
    if (data.floaterSide) setFloaterSide(data.floaterSide);
    if (data.floaterSize) setFloaterSize(data.floaterSize);
  }, []);

  function updateLocalStorage({
    newMarginBottom = marginBottom,
    newInvertedControls = invertedControls,
    newSettingsSaved = settingsSaved,
    newFloaterSide = floaterSide,
    newFloaterSize = floaterSize,
  }: {
    newMarginBottom?: number;
    newInvertedControls?: boolean;
    newSettingsSaved?: boolean;
    newFloaterSide: FloaterSide;
    newFloaterSize?: "default" | "sm" | "lg";
  }) {
    if (!newSettingsSaved) {
      localStorage.setItem("settings", "");
      return;
    }
    const newSettings = {
      marginBottom: newMarginBottom,
      invertedControls: newInvertedControls,
      floaterSide: newFloaterSide,
      floaterSize: newFloaterSize,
    };
    localStorage.setItem("settings", JSON.stringify(newSettings));
  }

  useEffect(() => {
    if (window) {
      window.addEventListener("beforeunload", (e) => {
        submit(`/read/${data.mangaName}/${currentChapter}`, {});
      });
    }
  }, []);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const timeSinceStart = intervalToDuration({
    start: new Date(data.startedAt || new Date()),
    end: new Date(),
  });
  const [totalMangaPages, setTotalMangaPages] = useState(0);
  function getTotalMangaPages() {
    const total = data.chaptersDetails.reduce(
      (acc, curr) => acc + curr.pagesAmount,
      0
    );
    setTotalMangaPages(total);
  }
  const { toast } = useToast();
  useEffect(() => {
    if (!data.isConnected && currentChapter > 1) {
      toast({
        title: "Sauvegardez votre progression",
        description:
          "Connectez-vous ou créez un compte pour enregistrer votre progression",
        action: (
          <a
            href={`/login?redirectTo=/read/${data.mangaName}/${currentChapter}`}
          >
            <ToastAction altText="Se connecter">Connection</ToastAction>
          </a>
        ),
        duration: 3500,
      });
    }
  }, []);
  return (
    <div className="flex flex-col justify-center">
      <Toaster />
      <div
        className={`${
          floaterSide !== FloaterSide.Top ? "lg:fixed" : ""
        } top-0 lg:top-2 ${
          floaterSide !== FloaterSide.Right ? "lg:left-3" : "lg:right-3 "
        } border border-gray-200 lg:rounded-md lg:backdrop-blur-3xl p-1 flex flex-col gap-1 mb-5`}
      >
        <ToggleGroup
          onValueChange={toggleOption}
          variant="default"
          type="multiple"
          value={options}
          size={floaterSize}
        >
          <ToggleGroupItem value="home">
            <Home />
          </ToggleGroupItem>
          {data.isConnected && (
            <>
              <ToggleGroupItem
                style={{
                  background: isFavorited ? "#e4e4e4" : "transparent",
                }}
                value="favorite"
              >
                <Star />
              </ToggleGroupItem>
              <ToggleGroupItem
                style={{
                  background: isWatchlisted ? "#e4e4e4" : "transparent",
                }}
                value="watchlist"
              >
                <ClockArrowUp />
              </ToggleGroupItem>
            </>
          )}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <ToggleGroupItem value="more">
                <Ellipsis />
              </ToggleGroupItem>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={async () => {
                    if (data.isConnected) {
                      const lastChapter = getLastChapterFromProgress(
                        data.progress
                      );
                      navigate(`/read/${data.mangaName}/${lastChapter}`);
                      setCurrentChapter(parseInt(lastChapter));
                    }
                  }}
                >
                  <ArrowUpToLine />
                  Dernier chapitre en cours
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate(`/manga/${data.mangaName}`)}
                >
                  <BookText />
                  Détails
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setDropdownOpen(false);
                    setSettingsDialogOpen(true);
                  }}
                >
                  <Settings />
                  Paramètres
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </ToggleGroup>
        <Separator />
        <ToggleGroup
          type="single"
          size={floaterSize}
          onValueChange={(vals) => {
            if (vals.includes("previous")) {
              navigate(`/read/${data.mangaName}/${currentChapter - 1}`);
              setCurrentChapter(currentChapter - 1);
            } else if (vals.includes("next")) {
              navigate(`/read/${data.mangaName}/${currentChapter + 1}`);
              setCurrentChapter(currentChapter + 1);
            }
          }}
          value={[]}
        >
          <ToggleGroupItem
            value="previous"
            className="w-full"
            disabled={currentChapter <= 1}
          >
            <ArrowLeft />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="next"
            className="w-full"
            disabled={currentChapter >= data.chaptersAmount}
          >
            <ArrowRight />
          </ToggleGroupItem>
        </ToggleGroup>
        <Separator />
        <Select
          onValueChange={(val) => {
            const num = parseInt(val);
            navigate(`/read/${data.mangaName}/${num}`);
            setCurrentChapter(num);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={
                "Chapitre " + currentChapter // + "/" + data.chaptersAmount
              }
            />
          </SelectTrigger>
          <SelectContent>
            {Array(data.chaptersAmount)
              .fill(0)
              .map((_, i) => (
                <SelectItem key={i} value={(i + 1).toString()}>
                  Chapitre {i + 1}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full px-2 lg:px-0 lg:flex justify-center">
        <div className="flex flex-col lg:w-1/2">
          {Array(
            data.chaptersDetails.find((c) => c.number === currentChapter)
              ?.pagesAmount
          )
            .fill(0)
            .map((_, i) => (
              <img
                key={i}
                src={mangaProvider.getPageUrl(
                  data.prettyMangaName,
                  currentChapter,
                  i + 1
                )}
                id={`page-${i}`}
              />
            ))}
        </div>
      </div>
      <div
        className="justify-center flex"
        style={{
          marginBottom: marginBottom + "%",
        }}
      >
        <div
          className={`flex ${
            invertedControls ? "flex-row-reverse" : "flex-row"
          } gap-2 justify-center my-4 w-full lg:w-1/2 mx-3 lg:mx-0`}
        >
          {currentChapter < data.chaptersAmount ? (
            <>
              <Button
                disabled={currentChapter <= 1}
                onClick={() => {
                  navigate(`/read/${data.mangaName}/${currentChapter - 1}`);
                  setCurrentChapter(currentChapter - 1);
                }}
                className={currentChapter > 1 ? "w-full" : ""}
              >
                Précédent
              </Button>
              <Button
                disabled={currentChapter >= data.chaptersAmount}
                onClick={() => {
                  navigate(`/read/${data.mangaName}/${currentChapter + 1}`);
                  setCurrentChapter(currentChapter + 1);
                }}
                className={currentChapter < data.chaptersAmount ? "w-full" : ""}
              >
                Suivant
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                getTotalMangaPages();
                setFinishDialogOpen(true);
              }}
              className="w-full"
            >
              Terminer
            </Button>
          )}
        </div>
      </div>

      <ResponsiveDialog
        open={settingsDialogOpen}
        setOpen={setSettingsDialogOpen}
        title="Paramètres"
        cancelButtonHidden
        submitText="Fermer"
        onSubmit={() => setSettingsDialogOpen(false)}
      >
        <div className="flex flex-col gap-3.5">
          <div className="flex gap-4 items-center">
            <Checkbox
              checked={invertedControls}
              id="invertedControls"
              onCheckedChange={(checked) => {
                setInvertedControls(!!checked);
                updateLocalStorage({ newInvertedControls: !!checked });
              }}
            />
            <label htmlFor="invertedControls" className="text-gray-900">
              Inverser les boutons en bas de pages
            </label>
          </div>
          <Separator />
          <div className="flex flex-col-reverse gap-3">
            <div className="flex gap-4 items-center justify-between">
              <Slider
                value={[marginBottom]}
                max={100}
                step={1}
                onValueChange={(vals) => {
                  setMarginBottom(vals[0]);
                  updateLocalStorage({ newMarginBottom: vals[0] });
                }}
              />
              <span>{marginBottom}%</span>{" "}
            </div>
            <label>Espace en bas de page (pour une main)</label>
          </div>
          {!isMobile && (
            <>
              <Separator />
              <div className="flex justify-between items-center">
                <p>Emplacement des controles</p>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={floaterSide}
                  onValueChange={(val: FloaterSide) => {
                    setFloaterSide(val);
                    updateLocalStorage({ newFloaterSide: val });
                  }}
                  size="sm"
                >
                  <ToggleGroupItem value={FloaterSide.Left}>
                    <PanelLeft />
                  </ToggleGroupItem>
                  <ToggleGroupItem value={FloaterSide.Right}>
                    <PanelRight />
                  </ToggleGroupItem>
                  <ToggleGroupItem value={FloaterSide.Top}>
                    <PanelTop />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex flex-col gap-1">
                <p>Taille des controles</p>
                <Select
                  value={floaterSize}
                  onValueChange={(val) => {
                    setFloaterSize(val as "default" | "sm" | "lg");
                    updateLocalStorage({
                      newFloaterSize: val as "default" | "sm" | "lg",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      {
                        value: "sm",
                        label: "Petit",
                      },
                      {
                        value: "default",
                        label: "Normal",
                      },
                      {
                        value: "lg",
                        label: "Grand",
                      },
                    ].map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <Separator />
          <div className="flex gap-4 items-center">
            <Checkbox
              checked={settingsSaved}
              id="settingsSaved"
              onCheckedChange={(checked) => {
                setSettingsSaved(!!checked);
                updateLocalStorage({ newSettingsSaved: !!checked });
              }}
            />
            <label htmlFor="settingsSaved" className="text-gray-900">
              Enregistrer sur l'appareil
            </label>
          </div>
        </div>
      </ResponsiveDialog>
      <ResponsiveDialog
        open={finishDialogOpen}
        setOpen={setFinishDialogOpen}
        cancelButtonHidden
        submitText="Terminer"
        onSubmit={finish}
        title={"Terminer " + data.prettyMangaName}
      >
        <div className="grid grid-cols-3 gap-x-2">
          {[
            {
              endText: "jours de lecture",
              value: timeSinceStart.days,
              delay: 500,
              showCondition: !!timeSinceStart.days,
            },
            {
              endText: "chapitres lus",
              value: data.chaptersDetails.length,
              delay: 1500,
              showCondition: true,
            },
            {
              endText: "chapitres / jour",
              value: Math.floor(
                data.chaptersDetails.length / timeSinceStart.days
              ),
              delay: 3000,
              showCondition: !!timeSinceStart.days,
            },
          ]
            .filter((el) => el.showCondition)
            .map((el) => (
              <div className="flex flex-col justify-center gap-1 bg-gray-100 rounded-lg p-2">
                <AnimatedStats
                  value={el.value}
                  startDelay={el.delay}
                  className="text-5xl flex justify-center"
                />
                <span className="text-center">{el.endText}</span>
              </div>
            ))}
        </div>
        <div className="grid grid-cols-2 gap-x-2 -mt-2">
          {[
            {
              endText: "pages lues",
              value: totalMangaPages,
              delay: 4500,
              showCondition: true,
            },
            {
              endText: "pages / jour",
              value: Math.floor(totalMangaPages / timeSinceStart.days),
              delay: 6000,
              showCondition: !!timeSinceStart.days,
            },
          ]
            .filter((el) => el.showCondition)
            .map((el) => (
              <div className="flex flex-col justify-center gap-1 bg-gray-100 rounded-lg p-2">
                <AnimatedStats
                  value={el.value}
                  startDelay={el.delay}
                  className="text-5xl flex justify-center"
                />
                <span className="text-center">{el.endText}</span>
              </div>
            ))}
        </div>
      </ResponsiveDialog>
    </div>
  );
}
