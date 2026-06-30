/*
 * Adapted from the free MIT Purity UI Dashboard Card component
 * by Creative Tim / Simmmple. Updated for React + TypeScript.
 */
import { Box, usePrefersReducedMotion, useStyleConfig, type BoxProps } from "@chakra-ui/react";

export function Card({ children, variant, ...rest }: BoxProps & { variant?: string }) {
  const styles = useStyleConfig("PurityCard", { variant });
  const reduceMotion = usePrefersReducedMotion();
  return (
    <Box
      __css={styles}
      animation={reduceMotion ? undefined : "purityFadeInUp 360ms cubic-bezier(0.22, 1, 0.36, 1) both"}
      {...rest}
    >
      {children}
    </Box>
  );
}
