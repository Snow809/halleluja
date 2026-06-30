/*
 * Adapted from the free MIT Purity UI Dashboard AdminNavbar component.
 */
import { Flex, type FlexProps } from "@chakra-ui/react";

export function AdminNavbar({ children, ...rest }: FlexProps) {
  return (
    <Flex
      minH="75px"
      align="center"
      px={{ base: 4, md: 6 }}
      py="8px"
      mx={{ base: 4, md: 6 }}
      mt="18px"
      bg="linear-gradient(112.83deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.82) 110.84%)"
      color="gray.700"
      border="1.5px solid"
      borderColor="white"
      borderRadius="16px"
      backdropFilter="blur(21px)"
      boxShadow="0px 7px 23px rgba(0, 0, 0, 0.05)"
      position="sticky"
      top="18px"
      zIndex={20}
      transition="box-shadow .25s linear, background-color .25s linear, border .25s linear"
      {...rest}
    >
      {children}
    </Flex>
  );
}
