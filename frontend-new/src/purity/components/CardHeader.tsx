/*
 * Adapted from the free MIT Purity UI Dashboard CardHeader component.
 */
import { Flex, type FlexProps } from "@chakra-ui/react";

export function CardHeader({ children, ...rest }: FlexProps) {
  return (
    <Flex width="100%" mb="18px" {...rest}>
      {children}
    </Flex>
  );
}

