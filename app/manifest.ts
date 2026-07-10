import type { MetadataRoute } from "next";

/** Lets the daily check-in live on a phone home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Momentum — personal productivity",
    short_name: "Momentum",
    description: "Category-based to-dos with deadlines, habits, weight, and stats.",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d0f",
    theme_color: "#0d0d0f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
