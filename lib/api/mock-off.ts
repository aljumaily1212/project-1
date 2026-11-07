// The stand-in for the demo backend (mock.ts) when the site runs on the real API (NEXT_PUBLIC_USE_MOCK is not "true").
// next.config.ts swaps it in for "demo-backend" at build time, so the real site contains no demo data, no demo phone
// numbers and no demo password. Nothing here is ever called: every use is behind USE_MOCK or SHOW_DEMO_ACCOUNTS.
import type * as Demo from "./mock";
import { httpApi } from "./http";

const off = (): never => {
  throw new Error("Demo mode is off");
};

export const MOCK_PASSWORD: string = "";

export const MOCK_LOGINS: typeof Demo.MOCK_LOGINS = {
  patient: "",
  reception: "",
  doctor: "",
  pharmacy: "",
  manager: "",
  lab: "",
  accountant: "",
};

export const mockApi: typeof Demo.mockApi = httpApi;

export const resetMockData: typeof Demo.resetMockData = () => undefined;

export const demoGateway: typeof Demo.demoGateway = { info: off, finish: off };
