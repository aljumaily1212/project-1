// A short note passed from the sign-up page to the sign-in page, and on to the family page, when the phone number
// already has an account. It lives only in this browser tab (sessionStorage), so the phone number and name are never
// put in the page address, where they would stay in the browser history and the server's logs.
export type Handoff = {
  phone: string;
  // Set when the person chose "add me as a family member": the family page opens with this name ready.
  addName?: string;
};

const KEY = "alrahma.handoff";

export function setHandoff(handoff: Handoff) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(handoff));
  } catch {
    // Private mode or storage turned off: the person just types the phone again.
  }
}

export function readHandoff(): Handoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Handoff) : null;
  } catch {
    return null;
  }
}

export function clearHandoff() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}
