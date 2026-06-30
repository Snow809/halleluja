import { Box, Text } from "@chakra-ui/react";

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <Box py={8} textAlign="center" color="gray.500">
      <Text fontWeight="900" color="gray.700">{title}</Text>
      {message ? <Text fontSize="sm" mt={1}>{message}</Text> : null}
    </Box>
  );
}
