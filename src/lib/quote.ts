// Quote reference in the MS-####-X format shown in the design.
export function generateQuoteCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  const letter = "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)];
  return `MS-${num}-${letter}`;
}

export const uid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
