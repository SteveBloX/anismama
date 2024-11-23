import { LoaderFunction } from "@remix-run/node";
import { getUser } from "~/session.server";
import { ROLE } from "~/types";
import { getAllMangas } from "~/providers/lib";
import { useLoaderData } from "@remix-run/react";
import AnimatedStats from "~/components/stats";

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  if (!user) {
    return { redirect: "/login" };
  }
  if (user.role !== ROLE.ADMIN) {
    return new Response("Forbidden", { status: 403 });
  }
  const allMangas = await getAllMangas();
  return { mangasAmount: allMangas.length };
};

export default function Dashboard() {
  const data: {
    mangasAmount: number;
  } = useLoaderData();
  return (
    <div className="w-full px-4">
      <h1 className="text-3xl font-bold mb-3">Dashboard</h1>
      <div className="flex flex-col justify-center gap-1 bg-gray-100 rounded-lg p-2 w-36">
        <AnimatedStats
          value={data.mangasAmount}
          startDelay={0}
          className="text-5xl flex justify-center"
        />
        <span className="text-center">{"mangas"}</span>
      </div>
    </div>
  );
}
