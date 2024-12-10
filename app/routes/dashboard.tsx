import { LoaderFunction } from "@remix-run/node";
import { getUser } from "~/session.server";
import { ROLE } from "~/types";
import { getAllMangas } from "~/providers/lib";
import { useLoaderData } from "@remix-run/react";
import AnimatedStats from "~/components/stats";
import { prisma } from "~/db.server";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  if (!user) {
    return { redirect: "/login" };
  }
  if (user.role !== ROLE.ADMIN) {
    return new Response("Forbidden", { status: 403 });
  }
  const allMangas = await getAllMangas();
  const users = await prisma.user.findMany();
  const mangasCount = await prisma.manga.count();
  const userMangaCount = await prisma.userManga.count();
  return { mangasAmount: allMangas.length, users, mangasCount, userMangaCount };
};

export default function Dashboard() {
  const data: {
    mangasAmount: number;
    users: { id: string; email: string }[];
    mangasCount: number;
    userMangaCount: number;
  } = useLoaderData();
  return (
    <div className="w-full px-4">
      <h1 className="text-3xl font-bold mb-3">Dashboard</h1>
      <div className="flex gap-4">
        <div className="flex flex-col justify-center gap-1 bg-gray-100 rounded-lg p-2 w-36">
          <AnimatedStats
            value={data.mangasAmount}
            startDelay={0}
            className="text-5xl flex justify-center"
          />
          <span className="text-center">{"mangas"}</span>
        </div>
        <div className="flex flex-col justify-center gap-1 bg-gray-100 rounded-lg p-2 w-36">
          <AnimatedStats
            value={data.users.length}
            startDelay={0}
            className="text-5xl flex justify-center"
          />
          <span className="text-center">{"utilisateurs"}</span>
        </div>
        <div className="flex flex-col justify-center gap-1 bg-gray-100 rounded-lg p-2 w-36">
          <AnimatedStats
            value={data.mangasCount}
            startDelay={0}
            className="text-5xl flex justify-center"
          />
          <span className="text-center">{"mangas découverts"}</span>
        </div>
        <div className="flex flex-col justify-center gap-1 bg-gray-100 rounded-lg p-2 w-36">
          <AnimatedStats
            value={data.userMangaCount}
            startDelay={0}
            className="text-5xl flex justify-center"
          />
          <span className="text-center">{"usermangas"}</span>
        </div>
      </div>
    </div>
  );
}
