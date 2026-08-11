const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrDecimal = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/** Formats a number as ₹40,000 / ₹1,25,000 using Indian digit grouping. */
export function formatINR(amount: number, decimals = false): string {
  if (!Number.isFinite(amount)) return "₹0";
  return decimals ? inrDecimal.format(amount) : inr.format(Math.round(amount));
}

/** Masked value for privacy mode. */
export function maskedINR(): string {
  return "₹••,•••";
}

export function formatCompactINR(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 10000000) return `${(amount / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000) return `${(amount / 100000).toFixed(2)} L`;
  if (abs >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return formatINR(amount);
}
