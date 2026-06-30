import type { ReactNode } from "react";
import { Badge, type BadgeProps } from "@chakra-ui/react";

export function StatusBadge({ value, ...props }: BadgeProps & { value?: ReactNode }) {
  const text = String(value ?? "N/A");
  const scheme =
    /approved|active|valid|done|completed|résolue|on/i.test(text) ? "green" :
    /pending|review|onboarding|offboarding|attente|cours/i.test(text) ? "orange" :
    /reject|inactive|archived|locked|off|refus/i.test(text) ? "red" :
    "blue";
  return (
    <Badge colorScheme={scheme} borderRadius="8px" px={3} py={1} fontSize="11px" fontWeight="bold" {...props}>
      {text}
    </Badge>
  );
}
