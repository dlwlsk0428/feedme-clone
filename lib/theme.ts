export const THEME_STORAGE_KEY = "theme";

// 첫 페인트 전에 실행해 깜빡임을 막는다. 저장된 선택이 없으면 OS 설정을 따른다.
export const themeInitScript = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}`;
