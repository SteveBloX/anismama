import { LoaderFunction, redirect } from "@remix-run/node";
import { getUser } from "~/session.server";
import { prisma } from "~/db.server";
import { Link, useLoaderData, useSearchParams } from "@remix-run/react";
import { UserManga } from "@prisma/client";
import { getAllMangas } from "~/providers/lib";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import Navbar from "~/components/navbar";
import { Input } from "~/components/ui/input";
import { normalizeString } from "~/utils";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  if (!user) {
    return redirect("/login");
  }
  const userMangas = await prisma.userManga.findMany({
    where: {
      userId: user.id,
    },
    include: {
      manga: true,
    },
  });
  console.log("Fetching all mangas");
  const mangas = await getAllMangas();
  console.log("Fetched all mangas");
  return { userMangas, mangas };
};

const tabs = [
  {
    id: "reading",
    label: "En cours",
  },
  {
    id: "favorites",
    label: "Favoris",
  },
  {
    id: "watchlist",
    label: "Watchlist",
  },

  { id: "read", label: "Lus" },
  {
    id: "all",
    label: "Tous",
  },
];

function MangasGrid({
  mangas,
  allMangas,
  showFavorite = false,
  showWatchlist = false,
  showProgress = false,
  searchTerm,
}: {
  mangas: any[];
  allMangas: any[];
  showFavorite?: boolean;
  showWatchlist?: boolean;
  showProgress?: boolean;
  searchTerm: string;
}) {
  return (
    <div className="bordered-grid mt-4">
      {mangas
        .filter((manga) => {
          const mangaData = allMangas.find((m) => m.id === manga.mangaId);
          return normalizeString(mangaData.title).includes(
            normalizeString(searchTerm)
          );
        })
        .map((manga) => {
          const mangaData = allMangas.find((m) => m.id === manga.mangaId);
          return (
            <Link
              to={`/manga/${mangaData.id}`}
              key={manga.id}
              className="bordered-grid-el flex flex-col gap-1"
            >
              <img
                src={mangaData.img}
                alt={mangaData.title}
                className="w-full rounded-lg mt-2"
              />
              <div className="">
                <h2 className="text-lg">{mangaData.title}</h2>{" "}
                {(showFavorite || showWatchlist) && (
                  <div className="flex gap-1 mt-1">
                    {" "}
                    {showFavorite && manga.isFavorited && (
                      <Badge variant="outline">Favori</Badge>
                    )}
                    {showWatchlist && manga.isWatchlisted && (
                      <Badge variant="outline">Watchlist</Badge>
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
    </div>
  );
}

export default function Library() {
  const { userMangas, mangas } = useLoaderData() as unknown as {
    userMangas: UserManga[];
    mangas: any[];
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentTabId, setCurrentTabId] = useState(
    searchParams.get("tab") || "reading"
  );
  const favoriteMangas = userMangas.filter(
    (manga) => manga && manga.isFavorited
  );
  const readingMangas = userMangas.filter(
    (manga) =>
      manga && !manga.finished && manga.progress && manga.progress !== "{}"
  );
  const watchlistMangas = userMangas.filter(
    (manga) => manga && manga.isWatchlisted
  );
  const readMangas = userMangas.filter(
    (manga) => manga && manga.timesFinished > 0
  );
  const [searchTerm, setSearchTerm] = useState("");
  return (
    <>
      <Navbar items={[{ title: "Accueil", link: "/" }]} />
      <div className="p-4">
        <h1 className="text-3xl mb-2 md:lg-0">Bibiliothèque</h1>
        <div className="flex flex-col gap-2 justify-center w-full">
          <ToggleGroup
            type="single"
            variant="outline"
            value={currentTabId}
            onValueChange={(newVal) => {
              setCurrentTabId(newVal || currentTabId);
            }}
          >
            {tabs.map((tab) => (
              <ToggleGroupItem value={tab.id} key={tab.id}>
                {tab.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <div className="w-full flex justify-center">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un manga"
              className="md:w-1/2 lg:w-1/3"
            />
          </div>
        </div>
        {currentTabId === "reading" && (
          <MangasGrid
            mangas={readingMangas}
            allMangas={mangas}
            showProgress={true}
            searchTerm={searchTerm}
          />
        )}
        {currentTabId === "favorites" && (
          <MangasGrid
            mangas={favoriteMangas}
            allMangas={mangas}
            searchTerm={searchTerm}
          />
        )}
        {currentTabId === "watchlist" && (
          <MangasGrid
            mangas={watchlistMangas}
            allMangas={mangas}
            searchTerm={searchTerm}
          />
        )}
        {currentTabId === "read" && (
          <MangasGrid
            mangas={readMangas}
            allMangas={mangas}
            showFavorite={true}
            showWatchlist={true}
            searchTerm={searchTerm}
          />
        )}
        {currentTabId === "all" && (
          <MangasGrid
            mangas={userMangas}
            allMangas={mangas}
            showFavorite={true}
            showWatchlist={true}
            searchTerm={searchTerm}
          />
        )}
      </div>
    </>
  );
}
