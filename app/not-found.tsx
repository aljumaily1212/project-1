import { ErrorScreen } from "@/components/error-screen";

// Any address the site doesn't have. The static build turns this into 404.html.
export default function NotFound() {
  return <ErrorScreen code={404} />;
}
