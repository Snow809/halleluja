import { Badge } from "@chakra-ui/react";

const colors: Record<string, string> = {
  PENDING: "orange",
  APPROVED: "green",
  REJECTED: "red",
  ACTIVE: "green",
  INACTIVE: "gray",
  ONBOARDING: "blue",
  OFFBOARDING: "purple",
};

const labels: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvé",
  REJECTED: "Refusé",
  ACTIVE: "Actif",
  INACTIVE: "Inactif",
  ONBOARDING: "Onboarding",
  OFFBOARDING: "Offboarding",
  VACATION: "Congé",
  DOCUMENT: "Document",
};

export function StatusBadge({ value }: { value?: string }) {
  const current = value ?? "—";
  return (
    <Badge colorScheme={colors[current] ?? "blue"} borderRadius="999px" px={3} py={1}>
      {labels[current] ?? current}
    </Badge>
  );
}
