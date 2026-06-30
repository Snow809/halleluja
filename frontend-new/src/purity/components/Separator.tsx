/*
 * Adapted from the free MIT Purity UI Dashboard Separator component.
 */
import { Flex, type FlexProps } from "@chakra-ui/react";

export function Separator(props: FlexProps) {
  return (
    <Flex
      h="1px"
      w="100%"
      bg="linear-gradient(90deg, rgba(224,225,226,0) 0%, #E0E1E2 49.52%, rgba(224,225,226,0) 100%)"
      {...props}
    />
  );
}

