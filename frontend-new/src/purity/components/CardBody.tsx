/*
 * Adapted from the free MIT Purity UI Dashboard CardBody component.
 */
import { Flex, type FlexProps } from "@chakra-ui/react";

export function CardBody({ children, ...rest }: FlexProps) {
  return (
    <Flex direction="column" width="100%" {...rest}>
      {children}
    </Flex>
  );
}

