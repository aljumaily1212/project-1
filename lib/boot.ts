export const DEFAULT_LOCALE = "ar";
export const LOCALE_KEY = "alrahma.locale";
export const THEME_KEY = "alrahma.theme";

export const bootScript =
  `try{var l=localStorage.getItem("${LOCALE_KEY}");if(l!=="en"&&l!=="ar")l="${DEFAULT_LOCALE}";document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr"}catch(e){}` +
  `try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="dark"&&t!=="light")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}`;
