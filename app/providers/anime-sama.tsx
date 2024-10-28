import { parse } from "node-html-parser";
import { Provider } from "~/providers/lib";
import { IndexManga, MangaChapters, MangaInfo } from "~/types";

async function getAllMangas(): Promise<IndexManga[]> {
  const res = await fetch("https://anime-sama.fr/catalogue/listing_all.php");
  const text = await res.text();
  const root = parse(text);
  const scanEls = root.querySelectorAll(".Scans");
  const scans: IndexManga[] = scanEls.map((el) => {
    const title = el.querySelector("h1")?.text;
    const link = el.querySelector("a")?.getAttribute("href");
    const img = el.querySelector("img")?.getAttribute("src");
    const alias = el.querySelector("p")?.text;
    const id = link?.split("catalogue/")[1].split("/")[0];
    const tags: string[] = [...el.classList._set]
      .filter(
        (tag: string) =>
          !["cardListAnime", "Scans", " ", "-", "VOSTFR", "VF", ""].includes(
            tag
          )
      )
      .map((tag: string) => tag.replace(",", ""));
    return { title, link, img, alias, id, tags };
  });
  return scans;
}

async function getManga(
  id: string,
  { info = false, chapters = false }
): Promise<MangaInfo & MangaChapters> {
  let coverImg, title, synopsis, tags, alternateNames;
  if (info) {
    console.log("Fetching manga info for", id);
    const res = await fetch(`https://anime-sama.fr/catalogue/${id}`);
    console.log("Request status", res.status);
    const text = await res.text();
    const root = parse(text);
    coverImg = root.getElementById("coverOeuvre")?.getAttribute("src");
    title = root.querySelector("#titreOeuvre")?.text;
    // get element by text content
    synopsis = root.text
      .split("Synopsis")[1]
      .split("Genres")[0]
      .replace(/\s+/g, " ")
      .trim();
    tags = root.text
      .split("Genres")[1]
      .split("Sources")[0]
      .replace(/\s+/g, " ")
      .trim()
      .split(", ");
    alternateNames = root.querySelector("#titreAlter")?.text.split(", ");
  }
  let chaptersDetails;
  if (chapters) {
    console.log("Fetching manga chapters for", id);
    const chaptersRes = await fetch(
      `https://anime-sama.fr/catalogue/${id}/scan/vf/episodes.js`
    );
    console.log("Request status", chaptersRes.status);
    const chaptersText = await chaptersRes.text();
    const chapters = chaptersText.match(/eps[0-9]+=/gm);
    chaptersDetails = chapters
      ?.map((ch, i) => {
        const num = i + 1;
        let pagesAmount;
        try {
          pagesAmount =
            chaptersText.split(`var eps${num}= [`)[1].split("];")[0].split(",")
              .length - 1;
        } catch (e) {
          try {
            pagesAmount = parseInt(
              chaptersText.split(`eps${num}.length = `)[1].split(";")[0]
            );
          } catch (e) {}
        }
        return {
          number: num,
          pagesAmount,
        };
      })
      .filter((ch) => ch.pagesAmount);
  }
  console.log("Fetched manga", id);
  return {
    ...(info && { coverImg, title, synopsis, tags, alternateNames }),
    ...(chapters && {
      chaptersAmount: chaptersDetails?.length,
      chaptersDetails,
    }),
  };
}

function getPageUrl(
  id: string,
  chapterNum: string | number,
  pageNum: string | number
) {
  return `https://anime-sama.fr/s2/scans/${id}/${chapterNum}/${pageNum}.jpg`;
}

const provider: Provider = {
  getAllMangas,
  getManga,
  getPageUrl,
};
export default provider;
