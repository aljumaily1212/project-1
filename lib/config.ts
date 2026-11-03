import { z } from "zod";

// Checks .env when the site starts, so a wrong value fails with a clear message.
const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url().default("http://localhost:8000"),
  NEXT_PUBLIC_USE_MOCK: z.enum(["true", "false"]).default("false"),
});

const result = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_USE_MOCK: process.env.NEXT_PUBLIC_USE_MOCK,
});

if (!result.success) {
  throw new Error(`Invalid .env file:\n${z.prettifyError(result.error)}`);
}

export const API_URL = result.data.NEXT_PUBLIC_API_URL.replace(/\/$/, "");

export const USE_MOCK = result.data.NEXT_PUBLIC_USE_MOCK === "true";

// The demo accounts box shows only on a developer's computer (npm run dev), never on a deployed site.
export const SHOW_DEMO_ACCOUNTS = USE_MOCK && process.env.NODE_ENV === "development";
