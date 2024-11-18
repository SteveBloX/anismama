import {
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useMatches,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunction } from "@remix-run/node";

import tailwind from "~/tailwind.css?url";
import globalStyles from "~/styles/global.css?url";
import { getUser, getUserId } from "~/session.server";
import { Button } from "~/components/ui/button";
import Navbar from "~/components/navbar";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "stylesheet", href: tailwind },
  { rel: "stylesheet", href: globalStyles },
  { rel: "icon", href: "/anismama.png", type: "image/png" },
];

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  return { user };
};

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}
