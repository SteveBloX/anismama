import { LoaderFunction } from "@remix-run/node"
import { useLoaderData } from "@remix-run/react"

export const loader: LoaderFunction = async ({params}) => {
    const res = await fetch(`https://anime-sama.fr/catalogue/${params.name}`)
    const text = await res.text()
    console.log("text", text)
    return {
        id: params.name
    }
}

export default function MangaDetails () {
    const data: {id: string} = useLoaderData()
    return <div></div>
}