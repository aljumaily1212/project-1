// Every error page the site has. Kept out of the "use client" error screen so the server-side
// /error/[code] page can read the list at build time.
export const ERROR_CODES = [400, 401, 403, 404, 408, 429, 500, 503] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
