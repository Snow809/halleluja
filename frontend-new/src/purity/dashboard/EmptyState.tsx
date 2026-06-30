import type { ReactNode } from "react";
import { Stack, Text } from "@chakra-ui/react";

export function EmptyState({ title = "Aucune donnée", description }: { title?: string; description?: ReactNode }) {
  return (
    <Stack align="center" justify="center" py={10} color="gray.400" textAlign="center">
      <Text fontWeight="bold" color="gray.700">{title}</Text>
      {description ? <Text fontSize="sm">{description}</Text> : null}
    </Stack>
  );
}
