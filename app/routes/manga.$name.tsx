import { ToggleGroup } from "@radix-ui/react-toggle-group";
import { ActionFunction, LoaderFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { ChevronsUpDown, ClockArrowUp, History, RotateCcw, Star } from "lucide-react";
import { parse } from "node-html-parser";
import { ToggleGroupItem } from "~/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { getUser } from "~/session.server";
import { prisma } from "~/db.server";
import { UserManga } from "@prisma/client";
import { useState } from "react";
import { Input } from "~/components/ui/input";
import { normalizeString, submit } from "~/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "~/components/ui/collapsible";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "~/components/ui/carousel";
import { ResponsiveDialog } from "~/components/reponsive-dialog";

export const loader: LoaderFunction = async ({ request, params }) => {
  const user = await getUser(request);
  const res = await fetch(`https://anime-sama.fr/catalogue/${params.name}`);
  const text = await res.text();
  const root = parse(text);
  const coverImg = root.getElementById("coverOeuvre")?.getAttribute("src");
  const title = root.querySelector("#titreOeuvre")?.text;
  // get element by text content
  const synopsis = root.text
    .split("Synopsis")[1]
    .split("Genres")[0]
    .replace(/\s+/g, " ")
    .trim();
  const tags = root.text
    .split("Genres")[1]
    .split("Sources")[0]
    .replace(/\s+/g, " ")
    .trim()
    .split(", ");
  const alternateNames = root.querySelector("#titreAlter")?.text.split(", ");
  /*const variants = root.querySelectorAll("h2").find((el) => el.text === "Manga")
    ?.nextElementSibling?.innerHTML;
  .map((el) => {});
  console.log(variants);*/
  let userManga;
  if (user) {
    userManga = await prisma.userManga.findFirst({
      where: {
        userId: user.id,
        mangaId: params.name
      },
    });
  }
  const chaptersRes = await fetch(
    `https://anime-sama.fr/catalogue/${params.name}/scan/vf/episodes.js`
  );
  const chaptersText = await chaptersRes.text();
  const chapters = chaptersText.match(/eps[0-9]+=/gm);
  const chaptersAmount = chapters?.length;
  return {
    id: params.name,
    synopsis,
    tags,
    title,
    coverImg,
    alternateNames,
    userManga,
    chaptersAmount
  };
};

export const action: ActionFunction = async ({request}) => {
  const user = await getUser(request)
  if (!user) {
    return new Response(null, {status: 401})
  }
  const data = await request.formData()
  const action = data.get("action") as Actions
  const mangaId = data.get("id") as string
  switch (action) {
    case Actions.SetSettings:
      const isFavorite = (data.get("isFavorite") as string) === "0" ? false : true
      const isWatchlist = (data.get("isWatchlist") as string) === "0" ? false : true
      const userManga = await prisma.userManga.findFirst({
        where: {
          userId: user.id,
          mangaId
        }
      })
      if (!userManga) {
        await prisma.userManga.create({
          data:{
            userId: user.id,
            mangaId,
            isFavorited: isFavorite,
            isWatchlisted: isWatchlist,
          }
        })
        break;
      }

      await prisma.userManga.updateMany({
        where: {
          userId: user.id,
          mangaId
        },
        data: {
          isFavorited: isFavorite,
          isWatchlisted: isWatchlist
        }
      })
      break;
  }
  return null;
}

enum Actions {
  SetSettings = "setSettings",
  ResetProgression = "resetProgression"
}
const toggleGroupActions = [
  {
    value: "favorite",
    description: "Ajouter aux favoris",
    icon: <Star />
  },
  {
    value: "watchlist",
    description: "Ajouter à la liste de lecture",
    icon: <ClockArrowUp />
  },
  {
    value: "history",
    description: "Historique de lecture",
    icon: <History />
  },
  {
    value: "restart",
    description: "Recommencer la lecture",
    icon: <RotateCcw />
  },
];



export default function MangaDetails() {
  const data: {
    id: string;
    synopsis: string;
    tags: string[];
    title: string;
    coverImg: string;
    alternateNames: string[];
    userManga: UserManga;
    chaptersAmount: number;
  } = useLoaderData();

  const [chaptersSearch, setChaptersSearch] = useState("");
  const [altTitlesOpen, setAltTitlesOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isWatchlist, setIsWatchlist] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const isFinished = data.userManga?.finished;
  const timeFinished = data.userManga?.timesFinished;
  const progress = JSON.parse(data.userManga?.progress || "{}");
  const [restartDialogOpen, setRestartDialogOpen] = useState(false)

  const [toggleGroupValue, setToggleGroupValue] = useState( data.userManga
    ? [
      data.userManga.isFavorited ? "favorite" : "",
      data.userManga.isWatchlisted ? "watchlist" : ""
    ]
    : [].filter(i=>i))
  console.log(toggleGroupValue, data.userManga, isFavorite, isWatchlist)

  async function toggleGroupChange(valArray: string[]) {
    const fav = valArray.includes("favorite")
    const watchlist = valArray.includes("watchlist")
    if ((valArray.includes("favorite") && !isFavorite) || (!valArray.includes("favorite") && isFavorite) || (valArray.includes("watchlist") && !isWatchlist) || (!valArray.includes("watchlist") && isWatchlist)) {
      const res = await submit(`/manga/${data.id}`, {
        action: Actions.SetSettings,
        id: data.id,
        isFavorite: fav ? "1" : "0",
        isWatchlist: watchlist ? "1" : "0"
      })
      if (res.status === 200) {
        setIsFavorite(fav)
        setIsWatchlist(watchlist)
      }
      else return;
    }
    if (valArray.includes("restart")) {
      setRestartDialogOpen(true)
    }
    setToggleGroupValue([...(fav ? ["favorite"]: []), ...(watchlist ? ["watchlist"] : [])])
  }
  async function reset() {
    const res = await submit(`/manga/${data.id}`, {
      action: Actions.ResetProgression,
      id: data.id
    })
  }

  return (
    <div className="flex justify-center w-[100vw] mt-10">
      <div className="mx-3 lg:mx-0 w-full lg:w-1/2 3xl:w-1/3 -ml-36">
        <div className="flex gap-2">
          <img src={data.coverImg} alt={data.title} className="rounded-lg h-auto" />
          <ToggleGroup
            type="multiple"
            orientation="vertical"
            className="flex flex-col justify-between gap-1"
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
                      className="p-8 h-full"
                      style={{
                        background: toggleGroupValue.includes(action.value) ? "#e8e8e8" : ""
                      }}
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
        <Collapsible open={altTitlesOpen} onOpenChange={setAltTitlesOpen}>
          <div className="flex gap-2">
            <h1 className="text-4xl font-bold mt-4">{data.title}</h1>{" "}
            {data.alternateNames && data.alternateNames.length > 0 && (
              <CollapsibleTrigger>
                <Button variant="ghost" asChild>
                  <ChevronsUpDown />
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
          <CollapsibleContent>
            <h4 className="text-lg font-bold mt-2">Autres titres</h4>
            <ul>
              {data.alternateNames.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          </CollapsibleContent>
        </Collapsible>
        <h3 className="text-lg mt-4 font-bold">Résumé</h3>
        <p className="mt-1">{data.synopsis}</p>
        {data.tags.length > 0 && (
          <Carousel className="mt-3 select-none">
            <CarouselContent className="">
              {data.tags.map((tag) => (
                <CarouselItem className="basis-1/8">
                  <Badge variant="outline">{tag}</Badge>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious /> <CarouselNext />
          </Carousel>
        )}
        <div className="w-full border border-gray-100 rounded-lg p-2 mt-5">
          <Input
            value={chaptersSearch}
            onChange={(e) => setChaptersSearch(e.target.value)}
            placeholder="Rechercher un chapitre..."
            className="shadow-none border-gray-100"
          />
          <div className="grid grid-cols-4 gap-x-1 gap-y-1 mt-2">
            {Array(data.chaptersAmount)
              .fill(0)
              .map((_, i) => `Chapitre ${i + 1}`)
              .filter((t) =>
                normalizeString(t).includes(normalizeString(chaptersSearch))
              )
              .map((t) => (
                <Link
                  to={`/read/${data.id}/${t.split("Chapitre ")[1]}`}
                  key={t}
                  className="p-2 border border-gray-100 rounded-md"
                >
                  {t}
                </Link>
              ))}
          </div>
        </div>
      </div>
      <ResponsiveDialog danger description="" submitText="Recommencer" onSubmit={reset} title="Recommencer le manga" open={restartDialogOpen} setOpen={setRestartDialogOpen}>
        Êtes-vous sur de vouloir recommencer ce manga à partir du début ?
      </ResponsiveDialog>
    </div>
  );
}
