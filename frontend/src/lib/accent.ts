export type AccentName = "indigo" | "emerald" | "rose" | "amber" | "ocean";
const KEY = "payday:accent";
const COLORS: Record<AccentName,{primary:string;soft:string}> = {
  indigo:{primary:"#4B4FE0",soft:"rgba(75,79,224,.10)"},
  emerald:{primary:"#0F9F78",soft:"rgba(15,159,120,.10)"},
  rose:{primary:"#D94F78",soft:"rgba(217,79,120,.10)"},
  amber:{primary:"#C88722",soft:"rgba(200,135,34,.12)"},
  ocean:{primary:"#1686B8",soft:"rgba(22,134,184,.10)"},
};
export function getAccent():AccentName {
  const value=localStorage.getItem(KEY) as AccentName|null;
  return value && value in COLORS ? value : "indigo";
}
export function applyAccent(value:AccentName) {
  const color=COLORS[value]||COLORS.indigo;
  document.documentElement.dataset.accent=value;
  document.documentElement.style.setProperty("--payday-primary",color.primary);
  document.documentElement.style.setProperty("--payday-primary-soft",color.soft);
  localStorage.setItem(KEY,value);
}
export function initAccent(){applyAccent(getAccent());}
