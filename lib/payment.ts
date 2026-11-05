import type { PaymentSession, PaymentStatus } from "./api";

// Where the payment page sends the patient back to. The server adds ?payment=<id>.
export const PAYMENT_RETURN_PATH = "/account/payment";

// The full return address on this site, for the server to give the gateway.
export const paymentReturnUrl = () => `${window.location.origin}${PAYMENT_RETURN_PATH}`;

// Opens the gateway's payment page. A full page load, not a router push: the real page is on another site.
export function goToPayment(session: PaymentSession) {
  window.location.assign(session.form_url);
}

export const isFinal = (status: PaymentStatus) => status !== "created";
