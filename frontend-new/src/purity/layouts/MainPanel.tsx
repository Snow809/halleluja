/*
 * Adapted from the free MIT Purity UI Dashboard MainPanel component.
 */
import { Box, useStyleConfig, type BoxProps } from "@chakra-ui/react";

export function MainPanel({ children, variant, ...rest }: BoxProps & { variant?: string }) {
  const styles = useStyleConfig("MainPanel", { variant });
  return (
    <Box __css={styles} {...rest}>
      {children}
    </Box>
  );
}

