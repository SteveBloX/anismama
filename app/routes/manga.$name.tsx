import { ToggleGroup } from "@radix-ui/react-toggle-group"
import { LoaderFunction } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"
import { Star } from "lucide-react"
import { parse } from "node-html-parser"
import { ToggleGroupItem } from "~/components/ui/toggle-group"

export const loader: LoaderFunction = async ({params}) => {
    const res = await fetch(`https://anime-sama.fr/catalogue/${params.name}`)
    const text = await res.text()
    const root = parse(text)
    const coverImg = root.getElementById("coverOeuvre")?.getAttribute("src")
    const title = root.querySelector("#titreOeuvre")?.text
    // get element by text content
    const synopsis = root.text.split("Synopsis")[1].split("Genres")[0].replace(/\s+/g, ' ').trim()
    const tags = root.text.split("Genres")[1].split("Sources")[0].replace(/\s+/g, ' ').trim().split(", ")
    return {
        id: params.name,
        synopsis,
        tags,
        title,
        coverImg
    }
}

export default function MangaDetails () {
    const data: {id: string; synopsis: string;tags: string[];title: string;coverImg:string} = useLoaderData()
    return (<div className="flex justify-center w-[100vw]">
        <div>
            <div className="flex w-1/2 gap-2">
        <img src={data.coverImg} alt={data.title} className="rounded-lg" /><ToggleGroup type="multiple" orientation="vertical" className="flex flex-col">
            <ToggleGroupItem value="1"><Star /></ToggleGroupItem>
            
        </ToggleGroup>
        </div></div>
    </div>)
}