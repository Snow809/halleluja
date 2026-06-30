/*
 * Adapted from Purity dashboard/table card patterns.
 */
import { Box, Flex, Icon, Progress, Table, Tbody, Td, Text, Th, Thead, Tr, type TableProps } from "@chakra-ui/react";
import type { LucideIcon } from "lucide-react";
import { MoreVertical } from "lucide-react";
import { Card, CardHeader } from "@/purity";

export { Tbody, Td, Th, Thead, Tr };

export function DataTable({ title, children, ...props }: TableProps & { title?: string }) {
  return (
    <Card p="16px" overflowX={{ base: "auto", xl: "hidden" }}>
      {title ? (
        <CardHeader p="12px 0px 28px 0px">
          <Text fontSize="lg" color="gray.700" fontWeight="bold" pb=".5rem">
            {title}
          </Text>
        </CardHeader>
      ) : null}
      <Table variant="simple" color="gray.700" size="sm" {...props}>
        {children}
      </Table>
    </Card>
  );
}

export function ProjectTableRow({ icon, name, detail, status, value, progress }: { icon?: LucideIcon; name: string; detail?: string; status?: string; value?: string; progress?: number }) {
  return (
    <Tr>
      <Td minW={{ base: "250px" }} pl="0px">
        <Flex alignItems="center" py=".8rem" minW="100%" flexWrap="nowrap">
          {icon ? <Icon as={icon} h="24px" w="24px" me="18px" color="brand.500" /> : null}
          <Box>
            <Text fontSize="md" color="gray.700" fontWeight="bold" minW="100%">
              {name}
            </Text>
            {detail ? <Text fontSize="sm" color="gray.400">{detail}</Text> : null}
          </Box>
        </Flex>
      </Td>
      {status ? <Td><Text fontSize="md" color="gray.700" fontWeight="bold">{status}</Text></Td> : null}
      {value ? <Td><Text fontSize="md" color="gray.700" fontWeight="bold">{value}</Text></Td> : null}
      {typeof progress === "number" ? (
        <Td>
          <Text fontSize="md" color="brand.500" fontWeight="bold" pb=".2rem">{progress}%</Text>
          <Progress colorScheme={progress === 100 ? "green" : "brand"} size="xs" value={progress} borderRadius="15px" />
        </Td>
      ) : null}
      <Td isNumeric><Icon as={MoreVertical} color="gray.400" /></Td>
    </Tr>
  );
}
