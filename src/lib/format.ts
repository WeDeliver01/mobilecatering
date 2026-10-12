export const ZAR = (n: number): string =>
  "R" + Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

export const ZARk = (n: number): string => {
  if (n >= 1000) return "R " + (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return ZAR(n);
};
