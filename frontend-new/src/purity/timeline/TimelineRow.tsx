/*
 * Adapted from Purity UI Dashboard `TimelineRow`.
 */
import { Box, Flex, Icon, Text } from "@chakra-ui/react";
import type { LucideIcon } from "lucide-react";

export function TimelineRow({ icon, title, date, color = "brand.500", index, arrLength }: { icon: LucideIcon; title: string; date: string; color?: string; index: number; arrLength: number }) {
  return (
    <Flex alignItems="center" minH="78px" justifyContent="start" mb="5px">
      <Flex direction="column" h="100%">
        <Icon as={icon} bg="white" color={color} h="30px" w="26px" pe="6px" zIndex="1" position="relative" left="-8px" />
        <Box w="2px" bg="gray.200" h={index === arrLength - 1 ? "15px" : "100%"} />
      </Flex>
      <Flex direction="column" justifyContent="flex-start" h="100%">
        <Text fontSize="sm" color="gray.700" fontWeight="bold">
          {title}
        </Text>
        <Text fontSize="sm" color="gray.400" fontWeight="normal">
          {date}
        </Text>
      </Flex>
    </Flex>
  );
}
