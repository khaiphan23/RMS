import type { ReactNode } from "react";

import { colors, mutedStyle, noticeStyle } from "./styles";

export function BaseStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      body { margin: 0; background: ${colors.bg}; color: ${colors.ink}; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
      a { color: inherit; }
      button, input, select, textarea { font: inherit; }
      summary { cursor: pointer; }
    `}</style>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "grid", gap: 4 }}>
        <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1.2 }}>{title}</h1>
        {description ? <p style={{ ...mutedStyle, margin: 0 }}>{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
}: {
  tone?: "error" | "info" | "success";
  children: ReactNode;
}) {
  return <div style={noticeStyle(tone)}>{children}</div>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: 20,
        borderRadius: 10,
        border: `1px dashed ${colors.line}`,
        color: colors.muted,
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}
