import { createTheme, type MantineColorsTuple } from "@mantine/core";

const royal: MantineColorsTuple = [
  "#f3edff",
  "#e0d7fa",
  "#beabf0",
  "#9a7ce6",
  "#7b54de",
  "#683bd9",
  "#5e2ed8",
  "#4e22c0",
  "#451dac",
  "#3a1798",
];

// Purple-tinted greys so modals and menus match the night-sky background.
const dark: MantineColorsTuple = [
  "#e4def7",
  "#bdb4dc",
  "#958bb8",
  "#6f6694",
  "#4c4470",
  "#3a3259",
  "#2d2648",
  "#221c39",
  "#1a152c",
  "#120e1c",
];

export const theme = createTheme({
  primaryColor: "royal",
  colors: { royal, dark },
  fontFamily: "Fredoka, system-ui, sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', ui-monospace, monospace",
  headings: { fontFamily: "Fredoka, system-ui, sans-serif", fontWeight: "700" },
  defaultRadius: "md",
  black: "#120e1c",
});
