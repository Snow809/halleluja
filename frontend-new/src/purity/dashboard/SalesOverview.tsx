/*
 * Adapted from Purity UI Dashboard `SalesOverview`.
 */
import type { ReactNode } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { Card, CardHeader } from "@/purity";

export function SalesOverview({ title, subtitle, chart }: { title: string; subtitle?: ReactNode; chart: ReactNode }) {
  return (
    <Card p="28px 10px 16px 0px" mb={{ base: "26px", lg: "0px" }}>
      <CardHeader mb="20px" pl="22px">
        <Flex direction="column" alignSelf="flex-start">
          <Text fontSize="lg" color="gray.700" fontWeight="bold" mb="6px">
            {title}
          </Text>
          {subtitle ? <Text fontSize="md" fontWeight="medium" color="gray.400">{subtitle}</Text> : null}
        </Flex>
      </CardHeader>
      <Box w="100%" h={{ base: "300px" }} ps="8px">
        {chart}
      </Box>
    </Card>
  );
}
