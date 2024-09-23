import { LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "react-router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export const loader: LoaderFunction = async ({ params }) => {
  // get chapters amount
  const res = await fetch(
    `https://anime-sama.fr/catalogue/${params.name}/scan/vf/episodes.js`
  );
  const text = await res.text();
  const chapters = text.match(/eps[0-9]+=/gm);
  const chaptersAmount = chapters?.length;
  const pagesAmount =
    text.split(`var eps${params.chapter}= [`)[1].split("];")[0].split(",")
      .length - 1;
  // get manga real name
  const mainPageRes = await fetch(
    `https://anime-sama.fr/catalogue/${params.name}/scan/vf/`
  );
  const mainPageText = await mainPageRes.text();
  const prettyMangaName = mainPageText
    .match(/<h3 id="titreOeuvre".+>(.+)<\/h3>/gm)[0]
    .split(">")[1]
    .split("<")[0];
  return {
    chaptersAmount,
    mangaName: params.name,
    chapterNumber: params.chapter,
    pagesAmount,
    prettyMangaName,
  };
};

export default function Read() {
  const data = useLoaderData();
  console.log(data);
  return (
    <div className="flex justify-center">
      <div className="w-1/2">
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex flex-col">
          {Array(data.pagesAmount)
            .fill(0)
            .map((_, i) => (
              <img
                key={i}
                src={`https://anime-sama.fr/s2/scans/${data.prettyMangaName}/${
                  data.chapterNumber
                }/${i + 1}.jpg`}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
