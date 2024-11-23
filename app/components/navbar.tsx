import { Sheet, SheetTrigger, SheetContent } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuLink,
} from "~/components/ui/navigation-menu";
import {
  Link,
  useLoaderData,
  useMatches,
  useRouteLoaderData,
} from "@remix-run/react";
import { ROLE } from "~/types";

const exceptions = ["routes/read.$name.$chapter"];

export default function Navbar() {
  const { user } = useRouteLoaderData("root");
  const matches = useMatches();
  const match = matches[matches.length - 1];
  const { pathname } = match;
  if (exceptions.includes(match.id)) {
    return null;
  }
  let items = [{ title: "Accueil", link: "/" }];
  if (user) {
    items.push({ title: "Ma bibliothèque", link: "/library" });
  }
  if (user && user.role === ROLE.ADMIN) {
    items.push({ title: "Dashboard", link: "/dashboard" });
  }
  return (
    <header className="flex h-20 w-full shrink-0 items-center px-4 md:px-6">
      <Sheet>
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
            {items.map((item) => (
              <Link
                key={item.link}
                to={item.link}
                className="flex w-full items-center py-2 text-lg font-semibold"
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
        <NavigationMenuList className="flex w-full items-center justify-between">
          <div className="w-full flex gap-3.5">
            {items.map((item) => (
              <Link to={item.link} key={item.link}>
                {item.title}
              </Link>
            ))}
          </div>
          <div className="flex justify-end p-3">
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
        </NavigationMenuList>
      </NavigationMenu>
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
