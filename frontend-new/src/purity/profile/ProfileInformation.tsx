/*
 * Adapted from the free MIT Purity UI Dashboard ProfileInformation component.
 */
import { Flex, Link, Text, useColorModeValue } from "@chakra-ui/react";
import { Card, CardBody, CardHeader } from "@/purity";

interface ProfileInformationProps {
  title: string;
  description: string;
  rows: Array<{ label: string; value: string }>;
}

export function ProfileInformation({ title, description, rows }: ProfileInformationProps) {
  const textColor = useColorModeValue("gray.700", "white");

  return (
    <Card p="16px" my={{ base: "24px", xl: "0px" }}>
      <CardHeader p="12px 5px" mb="12px">
        <Text fontSize="lg" color={textColor} fontWeight="bold">
          {title}
        </Text>
      </CardHeader>
      <CardBody px="5px">
        <Flex direction="column">
          <Text fontSize="md" color="gray.500" fontWeight="400" mb="30px">
            {description}
          </Text>
          {rows.map((row) => (
            <Flex key={row.label} align="center" mb="18px" wrap="wrap">
              <Text fontSize="md" color={textColor} fontWeight="bold" me="10px">
                {row.label}:{" "}
              </Text>
              <Text fontSize="md" color="gray.500" fontWeight="400">
                {row.value}
              </Text>
            </Flex>
          ))}
          <Flex align="center" mb="18px">
            <Text fontSize="md" color={textColor} fontWeight="bold" me="10px">
              Application:{" "}
            </Text>
            <Link href="/assistant" color="brand.500" fontSize="md" fontWeight="bold">
              ARIA
            </Link>
          </Flex>
        </Flex>
      </CardBody>
    </Card>
  );
}
