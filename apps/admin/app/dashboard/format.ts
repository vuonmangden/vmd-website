/** Formats an integer-VND string (BigInt precision, see ops-api.ts) with thousands separators — "1200000" -> "1.200.000". */
export function formatVnd(amount: string): string {
  const negative = amount.startsWith('-');
  const digits = negative ? amount.slice(1) : amount;
  if (!/^\d+$/.test(digits)) return amount;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return negative ? `-${grouped}` : grouped;
}
