/*
 * Purity-style page heading used to frame Intelli‑Talent pages with the same
 * compact hierarchy as the original dashboard sections.
 */
import type { ReactNode } from "react";
import { Box, Flex, Heading, Text, usePrefersReducedMotion } from "@chakra-ui/react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <Flex
      mb="26px"
      align={{ base: "flex-start", md: "center" }}
      justify="space-between"
      gap={4}
      direction={{ base: "column", md: "row" }}
      animation={reduceMotion ? undefined : "purityFadeInUp 300ms cubic-bezier(0.22, 1, 0.36, 1) both"}
    >
      <Box>
        <Heading size="lg" color="gray.700" letterSpacing="-0.02em">
          {title}
        </Heading>
        {subtitle ? (
          <Text mt={2} color="gray.400" fontSize="sm" fontWeight="semibold">
            {subtitle}
          </Text>
        ) : null}
      </Box>
      {actions}
    </Flex>
  );
}
