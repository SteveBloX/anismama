import { Sheet, SheetTrigger, SheetContent } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuLink,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from "~/components/ui/navigation-menu";
import {
  Link,
  useLoaderData,
  useMatches,
  useRouteLoaderData,
} from "@remix-run/react";
import { IndexManga, ROLE } from "~/types";
import { useEffect, useState } from "react";
import { submit } from "~/utils";
import { Input } from "~/components/ui/input";
import useDebounce from "~/hooks/useDebounce";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Skeleton } from "~/components/ui/skeleton";
import { ResponsiveDialog } from "~/components/reponsive-dialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Separator } from "~/components/ui/separator";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useNavigate } from "react-router";

const exceptions = ["routes/read.$name.$chapter"];

function ContentLink({
  children,
  ...props
}: {
  children: React.ReactNode;
  [key: string]: any;
}) {
  return (
    <Link
      {...props}
      className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 duration-100"
    >
      <NavigationMenuLink>{children}</NavigationMenuLink>
    </Link>
  );
}

export default function Navbar() {
  const { user } = useRouteLoaderData("root");
  const matches = useMatches();
  const match = matches[matches.length - 1];
  const { pathname } = match;

  let items = [{ title: "Accueil", link: "/" }];
  if (user) {
    items.push({ title: "Ma bibliothèque", link: "/library" });
  }
  if (user && user.role === ROLE.ADMIN) {
    items.push({ title: "Dashboard", link: "/dashboard" });
  }
  items.push({ title: "Manga aléatoire", link: "/random" });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const debouncedSearchResults = useDebounce(searchResults, 100);
  const [searchRequestStatus, setSearchRequestStatus] = useState(200);
  useEffect(() => {
    if (debouncedSearchQuery) {
      updateSearchResults(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery]);
  async function updateSearchResults(query: string) {
    const res = await submit("/api/search", {
      query: query,
    });
    const json = await res.json();
    console.log(json);
    setSearchResults(json);
    setSearchRequestStatus(res.status);
  }
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const navigate = useNavigate();
  if (exceptions.includes(match.id)) {
    return null;
  }
  return (
    <header className="flex h-20 w-full shrink-0 items-center px-4 md:px-6">
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <MenuIcon className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex justify-between h-full flex-col"
        >
          {/*<Link to="#">
            <img src={"/anismama.png"} className="h-10 w-auto" alt="anismama" />
            <span className="sr-only">Anismama</span>
          </Link>*/}
          <div className="grid gap-2">
            <Input
              placeholder={"Rechercher..."}
              readOnly
              className="cursor-pointer hover:bg-gray-50 mt-7"
              onClick={() => setIsAutocompleteOpen(true)}
              //onFocus={() => setIsAutocompleteOpen(true)}
            />
            {items.map((item) => (
              <Link
                key={item.link}
                to={item.link}
                className="flex w-full items-center py-2 text-lg font-semibold"
                onClick={() => setIsSheetOpen(false)}
              >
                {item.title}
              </Link>
            ))}
          </div>
          <div className="w-full">
            {!user ? (
              <div className="flex gap-2">
                <Link to={`/login?redirectTo=${pathname}`}>
                  <Button className="mb-5">Se connecter</Button>
                </Link>
                <Link to={`/join?redirectTo=${pathname}`}>
                  <Button className="mb-5">S'inscrire</Button>
                </Link>
              </div>
            ) : (
              <Link to="/logout">
                <Button className="mb-5">Se déconnecter</Button>
              </Link>
            )}
          </div>
        </SheetContent>
      </Sheet>
      {/*<Link to="/" className="mr-6 hidden lg:flex">
        <img src={"/anismama.png"} className="h-6 w-6" alt="anismama" />
        <span className="sr-only">Anismama</span>
      </Link>*/}
      <NavigationMenu className="hidden lg:flex">
        <NavigationMenuList className="flex w-full items-center justify-between gap-3.5">
          {/*items.map((item) => (
            <NavigationMenuItem key={item.link}>
              <Link to={item.link}>
                <NavigationMenuLink>{item.title}</NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          ))*/}
          <Link to="/">
            <NavigationMenuItem asChild>
              <NavigationMenuLink>Accueil</NavigationMenuLink>
            </NavigationMenuItem>
          </Link>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Mon compte</NavigationMenuTrigger>
            <NavigationMenuContent className="min-w-80 p-3 flex flex-col gap-2">
              {!user ? (
                <>
                  <ContentLink to={`/login?redirectTo=${pathname}`}>
                    Se connecter
                  </ContentLink>
                  <ContentLink to={`/join?redirectTo=${pathname}`}>
                    S'inscrire
                  </ContentLink>
                </>
              ) : (
                <>
                  <ContentLink to={`/library`}>Ma bibliothèque</ContentLink>
                  {user.role === ROLE.ADMIN && (
                    <ContentLink to={`/dashboard`}>Dashboard</ContentLink>
                  )}
                  <ContentLink to={`/logout`}>Se déconnecter</ContentLink>
                </>
              )}
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Outils</NavigationMenuTrigger>
            <NavigationMenuContent className="min-w-80 p-3 flex flex-col gap-2">
              <ContentLink to={`/random`}>Manga aléatoire</ContentLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <Input
            placeholder={"Rechercher..."}
            readOnly
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => setIsAutocompleteOpen(true)}
            //onFocus={() => setIsAutocompleteOpen(true)}
          />
          {/*<Popover
          //open={isAutocompleteOpen}
          //onOpenChange={setIsAutocompleteOpen}
          >
            <PopoverTrigger>
              <Input
                placeholder={"Rechercher"}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                }}
                value={searchQuery}
                //onFocus={() => setIsAutocompleteOpen(true)}
              />
            </PopoverTrigger>
            <PopoverContent onOpenAutoFocus={(e) => e.preventDefault()}>
              {searchRequestStatus === 200 ? (
                <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
                  {searchResults === debouncedSearchResults
                    ? searchResults.map((result: IndexManga) => (
                        <Link
                          key={result.id}
                          to={`/manga/${result.id}`}
                          className="flex gap-3 hover:bg-gray-100 duration-100 p-1.5 rounded-sm"
                        >
                          <img
                            src={result.img}
                            className="h-16 w-16 object-cover rounded-sm"
                          />
                          <div className="flex flex-col gap-0.5">
                            {" "}
                            <NavigationMenuLink className="font-bold">
                              {result.title}
                            </NavigationMenuLink>
                            <span className="text-sm text-gray-700">
                              {result.alias?.join(", ").slice(0, 50) +
                                (result.alias?.join(", ").length > 50
                                  ? "..."
                                  : "")}
                            </span>{" "}
                          </div>
                        </Link>
                      ))
                    : Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <div key={i} className="flex gap-3">
                            <Skeleton className="h-16 w-16 bg-gray-300 rounded-sm"></Skeleton>
                            <div className="flex flex-col gap-0.5">
                              <Skeleton className="h-4 w-24 bg-gray-300 rounded-sm"></Skeleton>
                              <Skeleton className="h-3 w-32 bg-gray-300 rounded-sm"></Skeleton>
                            </div>
                          </div>
                        ))}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-red-500">
                    Erreur {searchRequestStatus}
                  </span>
                  <span>Une erreur s'est produite lors de la recherche.</span>
                </div>
              )}
            </PopoverContent>
          </Popover>*/}
        </NavigationMenuList>
      </NavigationMenu>
      <Dialog open={isAutocompleteOpen} onOpenChange={setIsAutocompleteOpen}>
        <DialogTrigger>
          <button />
        </DialogTrigger>
        <DialogContent
          className="p-0 [&>button]:hidden flex flex-col gap-0"
          aria-describedby="Search"
        >
          <VisuallyHidden>
            <DialogTitle>Rechercher un manga</DialogTitle>
          </VisuallyHidden>
          <input
            className="w-full shadow-none border-0 bg-transparent outline-none p-3 pb-1 mb-2"
            placeholder="Rechercher un manga..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (searchResults.length > 0) {
                  navigate(`/manga/${searchResults[0].id}`);
                  setIsAutocompleteOpen(false);
                  setSearchQuery("");
                }
              }
            }}
          />
          <Separator />
          <div className="flex flex-col gap-1 px-2 mt-3 mb-2">
            {searchQuery ? (
              searchResults.map((result: IndexManga) => (
                <Link
                  key={result.id}
                  to={`/manga/${result.id}`}
                  className="flex gap-3 hover:bg-gray-100 duration-100 p-2 rounded-md"
                >
                  <img
                    src={result.img}
                    className="h-16 w-16 object-cover rounded-sm"
                  />
                  <div className="flex flex-col gap-0.5">
                    {result.title}
                    <span className="text-sm text-gray-700">
                      {result.alias?.join(", ").slice(0, 100) +
                        (result.alias?.join(", ").length > 100 ? "..." : "")}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="border-2 h-40 border-gray-100 rounded-sm p-4 text-center flex justify-center items-center">
                <span className="text-gray-500">
                  Recherchez un manga pour afficher les résultats ici.
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}

function MenuIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}
