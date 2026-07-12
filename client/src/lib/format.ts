// Shared formatting helpers so every screen renders the same way.

// Turns an enum value like UNDER_MAINTENANCE (or "under maintenance") into a
// human label: "Under Maintenance". Used by StatusBadge and anywhere an enum is
// shown as text, so labels never diverge screen to screen.
export function toLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Pulls the server's error message out of an Axios error, falling back to a
// caller-supplied default. Keeps every mutation's error toast consistent
// instead of each one re-reading response.data by hand.
export function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string } } };
  return e?.response?.data?.error ?? fallback;
}
