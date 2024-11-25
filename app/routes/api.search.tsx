import { ActionFunction } from "@remix-run/node";
import useProvider, { Providers } from "~/providers/lib";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const query = formData.get("query") as string;
  if (!query) {
    return new Response("No query provided", { status: 400 });
  }
  const prov = useProvider(Providers.animeSama);
  return await prov.searchManga(query);
};
