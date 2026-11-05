import { notFound } from "next/navigation";
import { ErrorScreen } from "@/components/error-screen";
import { ERROR_CODES, type ErrorCode } from "@/lib/error-codes";

// One page per error code, like /error/403 or /error/503, made at build time.
// The site or the server can send people here; any other number shows the 404 page.
export const dynamicParams = false;

export function generateStaticParams() {
  return ERROR_CODES.map((code) => ({ code: String(code) }));
}

export default async function ErrorPage({ params }: PageProps<"/error/[code]">) {
  const code = Number((await params).code) as ErrorCode;
  if (!ERROR_CODES.includes(code)) notFound();
  return <ErrorScreen code={code} />;
}
