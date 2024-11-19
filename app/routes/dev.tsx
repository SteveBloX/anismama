import { LoaderFunction } from "@remix-run/node";
import AnimatedStats from "~/components/stats";

export const loader: LoaderFunction = async () => {
  if (process.env.NODE_ENV === "production") {
    return { status: 404, redirect: "/404" };
  }
  return null;
};

export default function Dev() {
  return (
    <div>
      <AnimatedStats
        value={10}
        className="text-4xl font-bold"
        easeOutExponent={3}
      />
    </div>
  );
}
