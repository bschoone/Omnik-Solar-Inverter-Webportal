import { createTheme } from "@mui/material/styles";

/** Matches `frontend/src/index.css` dark shell for MUI X Charts. */
export const muiChartsDarkTheme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#0f1419", paper: "#1a222c" },
    text: { primary: "#e6edf3", secondary: "#8b949e" },
    divider: "#30363d",
  },
});
