/*
 * Adapted from the free MIT Purity UI Dashboard PanelContainer component.
 */
import { Box, useStyleConfig, type BoxProps } from "@chakra-ui/react";

export function PanelContainer({ children, variant, ...rest }: BoxProps & { variant?: string }) {
  const styles = useStyleConfig("PanelContainer", { variant });
  return (
    <Box __css={styles} {...rest}>
      {children}
    </Box>
  );
}

