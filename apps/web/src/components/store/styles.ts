import type { CSSProperties } from "react";

export const colors = {
  bg: "#f6f4ef",
  panel: "#ffffff",
  ink: "#1f2933",
  muted: "#667085",
  line: "#e4e7ec",
  brand: "#0f766e",
  brandSoft: "#e6f4f1",
  danger: "#b42318",
  dangerSoft: "#fef3f2",
  infoSoft: "#eff8ff",
  successSoft: "#ecfdf3",
};

export const pageStyle: CSSProperties = {
  display: "grid",
  gap: 18,
};

export const cardStyle: CSSProperties = {
  background: colors.panel,
  border: `1px solid ${colors.line}`,
  borderRadius: 12,
  padding: 16,
};

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: `1px solid ${colors.line}`,
  borderRadius: 8,
  font: "inherit",
  background: colors.panel,
  color: colors.ink,
};

export const labelStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 13,
  color: colors.muted,
};

export const buttonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: 0,
  borderRadius: 8,
  padding: "8px 12px",
  background: colors.brand,
  color: "#fff",
  fontWeight: 600,
  font: "inherit",
  cursor: "pointer",
  textDecoration: "none",
};

export const secondaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: colors.panel,
  color: colors.ink,
  border: `1px solid ${colors.line}`,
};

export const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: colors.dangerSoft,
  color: colors.danger,
  border: `1px solid #fecdca`,
};

export const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

export const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "8px 6px",
  borderBottom: `1px solid ${colors.line}`,
  color: colors.muted,
  fontSize: 12,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

export const tdStyle: CSSProperties = {
  padding: "9px 6px",
  borderBottom: `1px solid ${colors.line}`,
  verticalAlign: "top",
};

export const mutedStyle: CSSProperties = {
  color: colors.muted,
  fontSize: 13,
};

export const rowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

export const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

export function noticeStyle(tone: "error" | "info" | "success"): CSSProperties {
  const backgrounds = {
    error: colors.dangerSoft,
    info: colors.infoSoft,
    success: colors.successSoft,
  };

  return {
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${colors.line}`,
    background: backgrounds[tone],
    color: colors.ink,
    fontSize: 14,
  };
}
