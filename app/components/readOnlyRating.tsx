import React from "react";
import { Star } from "lucide-react";

import { cn } from "~/lib/utils";

const ratingVariants = {
  default: {
    star: "fill-primary",
    emptyStar: "fill-muted stroke-muted-foreground",
  },
  destructive: {
    star: "text-red-500",
    emptyStar: "text-red-200",
  },
  yellow: {
    star: "text-yellow-500",
    emptyStar: "text-yellow-200",
  },
};

interface RatingsProps extends React.HTMLAttributes<HTMLDivElement> {
  rating: number;
  totalStars?: number;
  size?: "sm" | "md" | "lg";
  fill?: boolean;
  Icon?: React.ReactElement;
  variant?: keyof typeof ratingVariants;
}

const ReadOnlyRating = ({ ...props }: RatingsProps) => {
  const {
    rating,
    totalStars = 5,
    size = "md",
    fill = true,
    Icon = <Star />,
    variant = "default",
  } = props;

  const fullStars = Math.floor(rating);
  const partialStar =
    rating % 1 > 0 ? (
      <PartialStar
        fillPercentage={rating % 1}
        size={size}
        className={cn(ratingVariants[variant].star)}
        Icon={Icon}
      />
    ) : null;

  return (
    <div className={cn("flex items-center gap-1")} {...props}>
      {[...Array(fullStars)].map((_, i) =>
        React.cloneElement(Icon, {
          key: i,
          className: cn(
            fill ? "fill-current" : "fill-transparent",
            ratingVariants[variant].star,
            `fill-current ${
              size === "sm" ? "h-3 w-3" : size === "md" ? "h-6 w-6" : "h-7 w-7"
            }`
          ),
        })
      )}
      {partialStar}
      {[...Array(totalStars - fullStars - (partialStar ? 1 : 0))].map((_, i) =>
        React.cloneElement(Icon, {
          key: i + fullStars + 1,
          className: cn(
            `fill-current ${
              size === "sm" ? "h-3 w-3" : size === "md" ? "h-6 w-6" : "h-7 w-7"
            }`,
            ratingVariants[variant].emptyStar
          ),
        })
      )}
    </div>
  );
};

interface PartialStarProps {
  fillPercentage: number;
  size: "sm" | "md" | "lg";
  className?: string;
  Icon: React.ReactElement;
}
const PartialStar = ({
  fillPercentage,
  size,
  className,
  Icon,
}: PartialStarProps) => {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Background Star (Empty) */}
      {React.cloneElement(Icon, {
        className: cn(
          `fill-current ${
            size === "sm" ? "h-3 w-3" : size === "md" ? "h-6 w-6" : "h-7 w-7"
          }`,
          ratingVariants.default.emptyStar
        ),
      })}
      {/* Foreground Star (Partial Fill) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          overflow: "hidden",
          width: `${fillPercentage * 100}%`,
        }}
      >
        {React.cloneElement(Icon, {
          className: cn(
            `fill-current ${
              size === "sm" ? "h-3 w-3" : size === "md" ? "h-6 w-6" : "h-7 w-7"
            }`,
            className
          ),
        })}
      </div>
    </div>
  );
};

export default ReadOnlyRating;
