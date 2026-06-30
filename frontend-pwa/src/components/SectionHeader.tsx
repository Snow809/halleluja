import { Heading, HStack, Text, VStack, type StackProps } from "@chakra-ui/react";
import type { ReactNode } from "react";

export function SectionHeader({ title, subtitle, action, ...props }: { title: string; subtitle?: string; action?: ReactNode } & StackProps) {
  return (
    <HStack justify="space-between" align="flex-start" {...props}>
      <VStack align="flex-start" spacing={1}>
        <Heading size="lg" letterSpacing="-0.03em">{title}</Heading>
        {subtitle ? <Text color="gray.500" fontSize="sm">{subtitle}</Text> : null}
      </VStack>
      {action}
    </HStack>
  );
}
