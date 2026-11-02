import { USE_MOCK } from "../config";
import { httpApi } from "./http";
import { mockApi } from "./mock";

export const api = USE_MOCK ? mockApi : httpApi;

export { ApiError } from "./errors";
export type * from "./types";
