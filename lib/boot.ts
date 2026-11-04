export const DEFAULT_LOCALE = "ar";
export const LOCALE_KEY = "alrahma.locale";
export const THEME_KEY = "alrahma.theme";
export const TEXT_SIZE_KEY = "alrahma.textSize";

export const bootScript =
  `try{var l=localStorage.getItem("${LOCALE_KEY}");if(l!=="en"&&l!=="ar")l="${DEFAULT_LOCALE}";document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr"}catch(e){}` +
  `try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="dark")t="light";document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}` +
  // The text size is set before the first paint too, so the page doesn't jump from small to big.
  `try{var s=localStorage.getItem("${TEXT_SIZE_KEY}");if(s==="large"||s==="larger")document.documentElement.dataset.text=s}catch(e){}`;
