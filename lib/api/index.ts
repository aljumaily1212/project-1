import { USE_MOCK } from "../config";
import { httpApi } from "./http";
// The demo backend, or an empty stand-in on the real API (see next.config.ts).
import { mockApi } from "demo-backend";

export const api = USE_MOCK ? mockApi : httpApi;

export { ApiError } from "./errors";
export type * from "./types";
