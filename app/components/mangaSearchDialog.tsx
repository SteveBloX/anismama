import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Separator } from "~/components/ui/separator";
import { IndexManga } from "~/types";
import { Link } from "@remix-run/react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import useDebounce from "~/hooks/useDebounce";
import { submit } from "~/utils";

function MangaSearchDialog({
  isAutocompleteOpen,
  setIsAutocompleteOpen,
  onMangaNavigate,
}: {
  isAutocompleteOpen: boolean;
  setIsAutocompleteOpen: (value: boolean) => void;
  onMangaNavigate: () => void;
}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<IndexManga>([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 250);
  const debouncedSearchResults = useDebounce(searchResults, 100);
  const [searchRequestStatus, setSearchRequestStatus] = useState(200);
  useEffect(() => {
    if (debouncedSearchQuery) {
      updateSearchResults(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery]);
  async function updateSearchResults(query: string) {
    const res = await submit("/api/search", {
      query: query,
    });
    const json = await res.json();
    console.log(json);
    setSearchResults(json);
    setSearchRequestStatus(res.status);
  }
  return (
    <Dialog open={isAutocompleteOpen} onOpenChange={setIsAutocompleteOpen}>
      <DialogTrigger>
        <button />
      </DialogTrigger>
      <DialogContent
        className="p-0 [&>button]:hidden flex flex-col gap-0"
        aria-describedby="Search"
      >
        <VisuallyHidden>
          <DialogTitle>Rechercher un manga</DialogTitle>
        </VisuallyHidden>
        <input
          className="w-full shadow-none border-0 bg-transparent outline-none p-3 pb-1 mb-2"
          placeholder="Rechercher un manga..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (searchResults.length > 0) {
                navigate(`/manga/${searchResults[0].id}`);
                onMangaNavigate();
              }
            }
          }}
        />
        <Separator />
        <div className="flex flex-col gap-1 px-2 mt-3 mb-2">
          {searchQuery ? (
            searchResults.map((result: IndexManga) => (
              <Link
                key={result.id}
                to={`/manga/${result.id}`}
                onClick={onMangaNavigate}
                className="flex gap-3 hover:bg-gray-100 duration-100 p-2 rounded-md"
              >
                <img
                  src={result.img}
                  className="h-16 w-16 object-cover rounded-sm"
                />
                <div className="flex flex-col gap-0.5">
                  {result.title}
                  <span className="text-sm text-gray-700">
                    {result.alias?.join(", ").slice(0, 100) +
                      (result.alias?.join(", ").length > 100 ? "..." : "")}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="border-2 h-40 border-gray-200 rounded-sm p-4 text-center flex justify-center items-center border-dashed">
              <span className="text-gray-500">
                Recherchez un manga pour afficher les résultats ici.
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default MangaSearchDialog;
