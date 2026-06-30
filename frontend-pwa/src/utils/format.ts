export function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function personName(person?: { firstName?: string; lastName?: string } | null) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ") || "—";
}
