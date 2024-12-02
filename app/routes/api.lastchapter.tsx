import { ActionFunction, redirect } from "@remix-run/node";
import { getUser } from "~/session.server";
import { prisma } from "~/db.server";

export const action: ActionFunction = async ({ request }) => {
  const user = await getUser(request);
  if (!user) {
    return redirect("/login");
  }
  const formData = await request.formData();
  const mangaId = formData.get("mangaId") as string;
  const userManga = await prisma.userManga.findFirst({
    where: {
      userId: user.id,
      mangaId: mangaId,
    },
  });
  if (!userManga) {
    return new Response("Manga not found", { status: 404 });
  }
  const progress = JSON.parse(userManga.progress);
  const latestChapter = Object.keys(progress).sort((a, b) => b - a)[0];
  return { latestChapter };
};
