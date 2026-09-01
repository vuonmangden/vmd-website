export function formatVnd(amount: bigint): string {
  return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
}

/** Renders a `@db.Date` value as `dd/mm/yyyy`, matching the operational-day label already stored on the column. */
export function formatDate(value: Date): string {
  const day = String(value.getUTCDate()).padStart(2, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${value.getUTCFullYear()}`;
}
