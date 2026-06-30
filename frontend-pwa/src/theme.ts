import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = { initialColorMode: "light", useSystemColorMode: false };

export const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: "#eef6ff",
      100: "#dcecff",
      200: "#b8d7ff",
      300: "#86b8ff",
      400: "#5294f5",
      500: "#2f76df",
      600: "#1d5fc0",
      700: "#184b98",
      800: "#173f7d",
      900: "#183866",
    },
    app: { bg: "#f4f7fb", surface: "#ffffff", border: "#e6edf7", muted: "#718096" },
  },
  fonts: {
    heading: "'Inter', system-ui, sans-serif",
    body: "'Inter', system-ui, sans-serif",
  },
  styles: {
    global: {
      body: { bg: "app.bg", color: "gray.800" },
      "#root": { minH: "100vh" },
      "*": { WebkitTapHighlightColor: "transparent" },
    },
  },
  components: {
    Button: { defaultProps: { colorScheme: "brand" }, baseStyle: { borderRadius: "16px", fontWeight: 800 } },
    Input: { defaultProps: { focusBorderColor: "brand.500" }, baseStyle: { field: { borderRadius: "16px" } } },
    Select: { defaultProps: { focusBorderColor: "brand.500" }, baseStyle: { field: { borderRadius: "16px" } } },
    Textarea: { defaultProps: { focusBorderColor: "brand.500" }, baseStyle: { borderRadius: "16px" } },
  },
});
