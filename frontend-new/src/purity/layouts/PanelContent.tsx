/*
 * Adapted from the free MIT Purity UI Dashboard PanelContent component.
 */
import { Box, useStyleConfig, type BoxProps } from "@chakra-ui/react";

export function PanelContent({ children, variant, ...rest }: BoxProps & { variant?: string }) {
  const styles = useStyleConfig("PanelContent", { variant });
  return (
    <Box __css={styles} {...rest}>
      {children}
    </Box>
  );
}

