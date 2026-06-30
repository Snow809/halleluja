import { Box, Container } from "@chakra-ui/react";
import type { ReactNode } from "react";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box minH="100vh" bg="brand.50" position="relative" overflow="hidden">
      <Box position="absolute" inset={0} opacity={0.34} bgImage="linear-gradient(#2f76df22 1px, transparent 1px), linear-gradient(90deg, #2f76df22 1px, transparent 1px)" bgSize="42px 42px" filter="blur(.6px)" />
      <Box position="absolute" top="-90px" right="-80px" boxSize="260px" borderRadius="full" bg="brand.300" opacity={0.35} />
      <Box position="absolute" bottom="-120px" left="-120px" boxSize="320px" borderRadius="full" bg="brand.500" opacity={0.14} />
      <Container maxW="480px" minH="100vh" display="flex" alignItems="center" justifyContent="center" position="relative" py={10}>
        {children}
      </Container>
    </Box>
  );
}
