
import type { NextConfig } from "next";

// "demo-backend" is the fake backend (lib/api/mock.ts) only when the demo is on. On the real API it is an empty
// stand-in (lib/api/mock-off.ts), so the demo accounts and password never reach the real site.
// Next.js reads .env before this file, so NEXT_PUBLIC_USE_MOCK is already known here.
const useMock = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const nextConfig: NextConfig = {
  output: "export",

  turbopack: {
    resolveAlias: {
      "demo-backend": useMock ? "./lib/api/mock.ts" : "./lib/api/mock-off.ts",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
