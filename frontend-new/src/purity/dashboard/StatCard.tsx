/*
 * Adapted from Purity UI Dashboard `MiniStatistics`.
 */
import type { ReactNode } from "react";
import { Flex, Icon, Stat, StatHelpText, StatLabel, StatNumber, useColorModeValue } from "@chakra-ui/react";
import type { LucideIcon } from "lucide-react";
import { Card, CardBody, IconBox } from "@/purity";

export function StatCard({
  label,
  value,
  helper,
  icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
  icon?: LucideIcon;
  tone?: "blue" | "green" | "orange" | "red" | "purple";
}) {
  const textColor = useColorModeValue("gray.700", "white");
  const color = {
    blue: "brand.500",
    green: "green.400",
    orange: "orange.400",
    red: "red.400",
    purple: "purple.400",
  }[tone];

  return (
    <Card minH="83px">
      <CardBody>
        <Flex flexDirection="row" align="center" justify="center" w="100%">
          <Stat me="auto">
            <StatLabel fontSize="sm" color="gray.400" fontWeight="bold" pb=".1rem">
              {label}
            </StatLabel>
            <Flex align="baseline">
              <StatNumber fontSize="lg" color={textColor} fontWeight="bold">
                {value}
              </StatNumber>
              {helper ? (
                <StatHelpText m="0px" ps="6px" color="gray.400" fontWeight="bold" fontSize="sm">
                  {helper}
                </StatHelpText>
              ) : null}
            </Flex>
          </Stat>
          {icon ? (
            <IconBox h="45px" w="45px" bg={color} color="white">
              <Icon as={icon} boxSize={5} />
            </IconBox>
          ) : null}
        </Flex>
      </CardBody>
    </Card>
  );
}
