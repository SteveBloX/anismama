import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { parse } from "node-html-parser";
import { useLoaderData } from "react-router";
import { Input } from "~/components/ui/input";
import { useState } from "react";
import { normalizeString } from "~/utils";
import { MultiSelect } from "~/components/multi-select";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const loader: LoaderFunction = async () => {
  const res = await fetch("https://anime-sama.fr/catalogue/listing_all.php");
  const text = await res.text();
  const root = parse(text);
  const scanEls = root.querySelectorAll(".Scans");
  const scans = scanEls.map((el) => {
    const title = el.querySelector("h1")?.text;
    const link = el.querySelector("a")?.getAttribute("href");
    const img = el.querySelector("img")?.getAttribute("src");
    const alias = el.querySelector("p")?.text;
    const id = link.split("catalogue/")[1].split("/")[0];
    const tags = [...el.classList._set]
      .filter(
        (tag) =>
          !["cardListAnime", "Scans", " ", "-", "VOSTFR", "VF", ""].includes(
            tag
          )
      )
      .map((tag) => tag.replace(",", ""));
    return { title, link, img, alias, id, tags };
  });
  return { scans };
};
type Scan = {
  title: string;
  link: string;
  img: string;
  alias: string;
  id: string;
  tags: string[];
};

export default function Index() {
  const {
    scans,
  }: {
    scans: Scan[];
  } = useLoaderData();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const filteredScans = scans.filter(
    (scan) =>
      normalizeString(scan.title).includes(normalizeString(searchTerm)) ||
      (normalizeString(scan.alias).includes(normalizeString(searchTerm)) &&
        selectedTags.length === 0) ||
      selectedTags.some((tag) => scan.tags.includes(tag.value))
  );
  const [tagsList] = useState(
    [...new Set(scans.map((scan) => scan.tags).flat())].map((tag) => ({
      label: tag,
      value: tag,
    }))
  );

  return (
    <div className="p-5">
      <div className={"flex justify-center"}>
        <Input
          placeholder="Search"
          className="shadow-lg w-1/2 p-5 mb-5"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <MultiSelect
          options={tagsList}
          onValueChange={setSelectedTags}
          value={selectedTags}
        />
      </div>
      <div className="grid grid-cols-5 gap-4">
        {filteredScans.map((manga) => (
          <Link to={`/read/${manga.id}/1`}>
            <div className="p-2 border-gray-100 border rounded-lg shadow-lg">
              <img src={manga.img} alt={manga.title} className="rounded-lg" />
              <h1 className="mt-2">{manga.title}</h1>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
