/*
 * Adapted from the free MIT Purity UI Dashboard PlatformSettings component.
 */
import { Flex, Switch, Text, useColorModeValue } from "@chakra-ui/react";
import { Card, CardBody, CardHeader } from "@/purity";

interface PlatformSettingsProps {
  title: string;
  groups: Array<{ title: string; items: Array<{ label: string; checked?: boolean }> }>;
}

export function PlatformSettings({ title, groups }: PlatformSettingsProps) {
  const textColor = useColorModeValue("gray.700", "white");
  const muted = useColorModeValue("gray.400", "gray.300");

  return (
    <Card p="16px">
      <CardHeader p="12px 5px" mb="12px">
        <Text fontSize="lg" color={textColor} fontWeight="bold">
          {title}
        </Text>
      </CardHeader>
      <CardBody px="5px">
        <Flex direction="column">
          {groups.map((group) => (
            <Flex key={group.title} direction="column" mb="24px">
              <Text fontSize="xs" color={muted} fontWeight="bold" mb="16px">
                {group.title}
              </Text>
              {group.items.map((item) => (
                <Flex key={item.label} align="center" mb="18px">
                  <Switch colorScheme="brand" me="10px" defaultChecked={item.checked} />
                  <Text fontSize="sm" color="gray.500" fontWeight="400">
                    {item.label}
                  </Text>
                </Flex>
              ))}
            </Flex>
          ))}
        </Flex>
      </CardBody>
    </Card>
  );
}
