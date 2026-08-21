import type { MetadataRoute } from "next";

// POC stage -- deliberately not indexed yet. Flip this to allow: "/" once
// we're ready to make Camp Compass publicly discoverable.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
