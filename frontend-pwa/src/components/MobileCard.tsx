import { Box, type BoxProps } from "@chakra-ui/react";

export function MobileCard(props: BoxProps) {
  return (
    <Box
      bg="white"
      borderRadius="24px"
      borderWidth="1px"
      borderColor="app.border"
      boxShadow="0 14px 34px rgba(112,144,176,.14)"
      p={4}
      {...props}
    />
  );
}
