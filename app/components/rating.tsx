import { Star } from "lucide-react";
import ReadOnlyRating from "~/components/readOnlyRating";

export default function Rating({
  rating,
  setRating,
  maxRating = 5,
  size = "md",
  disabled = false,
}: {
  rating: number;
  setRating: (rating: number) => void;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}) {
  return !disabled ? (
    <div className="flex items-center gap-1 cursor-pointer">
      {Array(maxRating)
        .fill(0)
        .map((_, i) => (
          <Star
            key={i}
            className={`${
              size === "sm" ? "h-3 w-3" : size === "md" ? "h-6 w-6" : "h-7 w-7"
            } ${
              i < rating ? "fill-primary" : "fill-muted stroke-muted-foreground"
            }`}
            onClick={() => {
              let newRating = i + 1;
              if (newRating === rating) {
                setRating(0);
                return;
              }
              setRating(newRating);
            }}
          />
        ))}
    </div>
  ) : (
    <ReadOnlyRating totalStars={maxRating} rating={rating} size={size} />
  );
}
