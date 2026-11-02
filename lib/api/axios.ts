import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { API_URL } from "../config";
import { clearSession, getRefreshToken, getToken, updateTokens } from "../auth";
import { DEFAULT_LOCALE, LOCALE_KEY } from "../boot";
import { ApiError, NETWORK_ERROR } from "./errors";
import type { ApiEnvelope, LoginResponse } from "./types";

const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/public/"];

export const http = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
});

function currentLocale() {
  try {
    return localStorage.getItem(LOCALE_KEY) ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

http.interceptors.request.use((config) => {
  const isPublic = PUBLIC_PATHS.some((p) => config.url?.startsWith(p));
  const token = getToken();
  if (!isPublic && token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["Accept-Language"] = currentLocale();
  return config;
});

let refreshing: Promise<string | null> | null = null;

function refreshToken(): Promise<string | null> {
  const token = getRefreshToken();
  if (!token) return Promise.resolve(null);
  refreshing ??= axios
    .post<ApiEnvelope<LoginResponse>>(`${API_URL}/auth/refresh`, { refresh_token: token }, { timeout: 20_000 })
    .then(({ data }) => {
      if (!data.success || !data.data.refresh_token) return null;
      updateTokens(data.data.access_token, data.data.refresh_token);
      return data.data.access_token;
    })
    .catch(() => null)
    .finally(() => (refreshing = null));
  return refreshing;
}

http.interceptors.response.use(
  (res: AxiosResponse<ApiEnvelope<unknown>>) => {
    const body = res.data;
    if (body && body.success === false) {
      throw new ApiError(res.status, body.message, body.errors, undefined, body.code);
    }
    return { ...res, data: body?.success ? body.data : body };
  },
  async (err: AxiosError<ApiEnvelope<unknown>>) => {
    if (!err.response) {
      throw new ApiError(NETWORK_ERROR, "");
    }
    const { status, data } = err.response;
    const config = err.config as (InternalAxiosRequestConfig & { retried?: boolean }) | undefined;
    const isAuthCall = PUBLIC_PATHS.some((p) => config?.url?.startsWith(p));
    if (status === 401 && config && !config.retried && !isAuthCall) {
      const token = await refreshToken();
      if (token) {
        config.retried = true;
        config.headers.Authorization = `Bearer ${token}`;
        return http(config);
      }
    }
    if (status === 401 && !isAuthCall) {
      clearSession();
    }
    const message = data && data.success === false ? data.message : "";
    const errors = data && data.success === false ? data.errors : undefined;
    const code = data && data.success === false ? data.code : undefined;
    const retryAfter = Number(err.response.headers["retry-after"]) || undefined;
    throw new ApiError(status, message, errors, retryAfter, code);
  },
);
