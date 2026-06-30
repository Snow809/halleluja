/*
 * Adapted from the free MIT Purity UI Dashboard IconBox component.
 */
import { Flex, type FlexProps } from "@chakra-ui/react";

export function IconBox({ children, ...rest }: FlexProps) {
  return (
    <Flex alignItems="center" justifyContent="center" borderRadius="12px" {...rest}>
      {children}
    </Flex>
  );
}

