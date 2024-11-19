import { ActionFunction } from "@remix-run/node";
import { recommendByTags } from "~/recommendation";
import { getAllMangas } from "~/providers/lib";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const tags = (formData.get("tags") as unknown as string).split(",");
  const mangaId = formData.get("mangaId") as string;
  console.log(tags);
  const allMangas = (await getAllMangas()).filter(
    (manga) => manga.id !== mangaId
  );
  return recommendByTags(allMangas, tags).slice(0, 5);
};
