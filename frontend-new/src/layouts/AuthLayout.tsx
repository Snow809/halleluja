import type { ReactNode } from "react";
import { Box, Flex, Heading, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { AuthNavbar } from "@/purity";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <SimpleGrid minH="100vh" columns={{ base: 1, lg: 2 }} bg="app.bg">
      <Box display={{ base: "none", lg: "block" }} position="relative" overflow="hidden" bgGradient="linear(155deg, brand.700, brand.500 55%, blue.400)" color="white">
        <AuthNavbar />
        <Flex h="100%" direction="column" justify="center" px={12} position="relative">
          <Box position="absolute" right="-120px" bottom="-140px" w="380px" h="380px" borderRadius="full" bg="whiteAlpha.200" />
          <Stack spacing={5} maxW="590px" zIndex={1}>
            <Text fontSize="sm" fontWeight="900" textTransform="uppercase" color="whiteAlpha.800">Purity UI HR Dashboard</Text>
            <Heading size="2xl" lineHeight="1.05">Un tableau de bord RH clair, premium et rapide.</Heading>
            <Text fontSize="lg" color="whiteAlpha.850" lineHeight="1.8">
              Congés, documents, onboarding, risques QVT et ARIA dans une interface Chakra inspirée du vrai template Purity UI.
            </Text>
          </Stack>
        </Flex>
      </Box>
      <Flex align="center" justify="center" px={{ base: 5, md: 10 }} py={10}>
        {children}
      </Flex>
    </SimpleGrid>
  );
}
