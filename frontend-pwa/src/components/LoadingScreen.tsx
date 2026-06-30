import { Center, Spinner, Stack, Text } from "@chakra-ui/react";

export function LoadingScreen({ label = "Chargement..." }: { label?: string }) {
  return (
    <Center minH="100vh" bg="app.bg">
      <Stack align="center" spacing={4}>
        <Spinner color="brand.500" size="lg" thickness="3px" />
        <Text color="gray.500" fontWeight="700">{label}</Text>
      </Stack>
    </Center>
  );
}
