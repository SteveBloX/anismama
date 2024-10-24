/**
 * v0 by Vercel.
 * @see https://v0.dev/t/87FszxrAaMz
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { Sheet, SheetTrigger, SheetContent } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuLink,
} from "~/components/ui/navigation-menu";
import { Link } from "@remix-run/react";

export default function Navbar({
  items,
}: {
  items: {
    title: string;
    link: string;
  }[];
}) {
  return (
    <header className="flex h-20 w-full shrink-0 items-center px-4 md:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="lg:hidden">
            <MenuIcon className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left">
          {/*<Link to="#">
            <img src={"/anismama.png"} className="h-10 w-auto" alt="anismama" />
            <span className="sr-only">Anismama</span>
          </Link>*/}
          <div className="grid gap-2 py-6">
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
        </SheetContent>
      </Sheet>
      {/*<Link to="/" className="mr-6 hidden lg:flex">
        <img src={"/anismama.png"} className="h-6 w-6" alt="anismama" />
        <span className="sr-only">Anismama</span>
      </Link>*/}
      <NavigationMenu className="hidden lg:flex">
        <NavigationMenuList>
          {items.map((item) => (
            <Link to={item.link} key={item.link}>
              {item.title}
            </Link>
          ))}
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
