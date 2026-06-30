/*
 * Adapted from Purity dashboard card sections such as SalesOverview/Projects.
 */
import type { ReactNode } from "react";
import { Flex, Text, type BoxProps } from "@chakra-ui/react";
import { Card, CardBody, CardHeader } from "@/purity";

export function Panel({ title, action, children, ...props }: BoxProps & { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <Card p="16px" {...props}>
      {title || action ? (
        <CardHeader p="12px 0px 18px 0px" align="center" justify="space-between">
          {title ? <Text fontSize="lg" color="gray.700" fontWeight="bold">{title}</Text> : <span />}
          {action}
        </CardHeader>
      ) : null}
      <CardBody>{children}</CardBody>
    </Card>
  );
}
