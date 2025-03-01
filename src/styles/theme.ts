import { theme as baseTheme } from "@chakra-ui/react";

const theme = {
  ...baseTheme,
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
    mono: 'var(--font-mono)',
  },
  colors: {
    ...baseTheme.colors,
    brand: {
      50: '#e6f6ff',
      100: '#b3e0ff',
      200: '#80cbff',
      300: '#4db5ff',
      400: '#1a9fff',
      500: '#0078d4', // Primary brand color
      600: '#0062ab',
      700: '#004b82',
      800: '#003559',
      900: '#001e30',
    },
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: true,
  },
};

export default theme; 