import { extendTheme, type ThemeConfig } from "@chakra-ui/react";

export const drawerWidth = 260;

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  fonts: {
    heading: "'Inter', 'Segoe UI', system-ui, sans-serif",
    body: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  colors: {
    brand: {
      50: "#eef5ff",
      100: "#d9eaff",
      200: "#b6d5ff",
      300: "#86b8ff",
      400: "#5796f6",
      500: "#2f76df",
      600: "#1f5fc4",
      700: "#1d4f9f",
      800: "#1c437f",
      900: "#1b3968",
    },
  },
  semanticTokens: {
    colors: {
      "app.bg": { default: "#f8f9fa" },
      "app.card": { default: "#ffffff" },
      "app.border": { default: "#e9ecef" },
      "app.text": { default: "#2d3748" },
      "app.muted": { default: "#718096" },
    },
  },
  components: {
    Button: {
      defaultProps: { colorScheme: "brand" },
      baseStyle: {
        borderRadius: "12px",
        fontWeight: "700",
        boxShadow: "none",
      },
    },
    Input: {
      defaultProps: { focusBorderColor: "brand.500" },
      variants: {
        outline: {
          field: {
            bg: "white",
            borderColor: "app.border",
            borderRadius: "12px",
          },
        },
      },
    },
    Select: {
      defaultProps: { focusBorderColor: "brand.500" },
    },
    Textarea: {
      defaultProps: { focusBorderColor: "brand.500" },
    },
    Card: {
      baseStyle: {
        container: {
          bg: "white",
          borderRadius: "20px",
          boxShadow: "0 18px 40px rgba(112, 144, 176, 0.12)",
        },
      },
    },
    PurityCard: {
      baseStyle: {
        p: "22px",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        position: "relative",
        minWidth: 0,
        wordWrap: "break-word",
        bg: "white",
        backgroundClip: "border-box",
        border: "0 solid rgba(0,0,0,.125)",
        borderRadius: "15px",
        boxShadow: "0px 3.5px 5.5px rgba(0, 0, 0, 0.02)",
      },
    },
    MainPanel: {
      baseStyle: {
        maxWidth: "100%",
        overflow: "auto",
        position: "relative",
        minH: "100vh",
        maxHeight: "100%",
        transition: "all .33s cubic-bezier(.685,.0473,.346,1)",
      },
    },
    PanelContainer: {
      baseStyle: {
        p: { base: "18px", md: "30px" },
        pt: { base: "28px", md: "36px" },
        minH: "calc(100vh - 120px)",
      },
    },
    PanelContent: {
      baseStyle: {
        mx: "auto",
        maxW: "100%",
        ps: { base: 0, md: "15px" },
        pe: { base: 0, md: "15px" },
      },
    },
  },
  styles: {
    global: {
      "html, body, #root": {
        minHeight: "100%",
      },
      body: {
        bg: "app.bg",
        color: "app.text",
        fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
      },
      "*": { boxSizing: "border-box" },
      "@keyframes floatGeometry": {
        "0%, 100%": { transform: "translate3d(0, 0, 0) rotate(0deg)" },
        "50%": { transform: "translate3d(18px, -22px, 0) rotate(8deg)" },
      },
      "@keyframes slowPulse": {
        "0%, 100%": { opacity: 0.22 },
        "50%": { opacity: 0.42 },
      },
      "@keyframes purityFadeInUp": {
        "0%": { opacity: 0, transform: "translate3d(0, 10px, 0)", filter: "blur(2px)" },
        "100%": { opacity: 1, transform: "translate3d(0, 0, 0)", filter: "blur(0)" },
      },
    },
  },
});
