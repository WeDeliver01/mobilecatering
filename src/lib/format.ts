// Manual thousands-grouping (not toLocaleString) so server and client render
// byte-identical output. Intl's en-ZA grouping separator varies between
// Node's ICU build and the browser's, which caused SSR/CSR hydration mismatches.
const groupThousands = (n: number): string =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

export const ZAR = (n: number): string => "R" + groupThousands(n);

export const ZARk = (n: number): string => {
  if (n >= 1000) return "R " + (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return ZAR(n);
};
