export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
