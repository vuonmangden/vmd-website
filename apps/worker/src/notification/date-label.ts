/** Renders a `@db.Date` value as its stored `YYYY-MM-DD` label (the column already holds a UTC-midnight instant for that calendar date, so no timezone conversion is needed). */
export function dateLabel(value: Date): string {
  return value.toISOString().slice(0, 10);
}
