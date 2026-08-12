"use client";

import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme({
  cssVariables: true,
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: "var(--font-geist-sans), Geist, system-ui, sans-serif",
    button: { textTransform: "none", fontWeight: 620 },
  },
  components: {
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiMenu: {
      defaultProps: {
        marginThreshold: 12,
      },
      styleOverrides: {
        paper: {
          maxHeight: 320,
          marginTop: 4,
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--surface-elevated)",
          boxShadow: "var(--shadow-md)",
          color: "var(--text)",
        },
        list: {
          padding: 6,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          minHeight: 36,
          borderRadius: 6,
          paddingInline: 10,
          color: "var(--text-secondary)",
          fontSize: 12,
          "&:hover": {
            background: "var(--surface-muted)",
            color: "var(--text)",
          },
          "&.Mui-selected": {
            background: "var(--brand-soft)",
            color: "var(--brand)",
            fontWeight: 620,
          },
          "&.Mui-selected:hover": {
            background: "var(--brand-soft)",
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        root: { zIndex: 120 },
        paper: {
          border: "1px solid var(--border-strong)",
          borderRadius: 12,
          background: "var(--surface-elevated)",
          backgroundImage: "none",
          boxShadow: "var(--shadow-md)",
          color: "var(--text)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { padding: 0 } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: 0 } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: 0 } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          border: "1px solid var(--border)",
          background: "var(--surface-elevated)",
          boxShadow: "var(--shadow-md)",
          color: "var(--text)",
          fontSize: 11,
        },
        arrow: { color: "var(--surface-elevated)" },
      },
    },
  },
});

export function MuiProvider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
