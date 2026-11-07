import type { NextConfig } from "next";

const isPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  ...(isPages
    ? {
        output: "export" as const,
        basePath: "/diari",
        assetPrefix: "/diari/",
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {
        // Headless/local testing hits 127.0.0.1 while the server may see localhost.
        allowedDevOrigins: ["127.0.0.1", "localhost"],
      }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
