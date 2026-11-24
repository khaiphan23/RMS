"use client";

import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";

import { deleteTable, saveTable } from "@/app/(store)/dashboard/tables/actions";
import { buildTablePath, buildTableUrl } from "@/lib/qr/links";
import type { ActionResult } from "@/lib/supabase/types";

import {
  buttonStyle,
  cardStyle,
  colors,
  dangerButtonStyle,
  gridStyle,
  inputStyle,
  labelStyle,
  mutedStyle,
  rowStyle,
  secondaryButtonStyle,
} from "./styles";
import { EmptyState, Notice } from "./ui";

export type DiningTableView = {
  id: string;
  table_code: string;
  name: string;
  active: boolean;
};

export function TablesManager({
  tables,
  canEdit,
  storeSlug,
  storeName,
}: {
  tables: DiningTableView[];
  canEdit: boolean;
  storeSlug: string;
  storeName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [qrError, setQrError] = useState<string | null>(null);

  const tableKey = tables.map((table) => `${table.id}:${table.table_code}`).join("|");

  useEffect(() => {
    let active = true;

    if (tables.length === 0) {
      setQrImages({});
      setQrError(null);
      return () => {
        active = false;
      };
    }

    setQrError(null);
    setQrImages({});

    Promise.all(
      tables.map(async (table) => {
        const dataUrl = await QRCode.toDataURL(buildTableUrl(storeSlug, table.table_code), {
          width: 512,
          margin: 1,
          errorCorrectionLevel: "M",
          color: { dark: "#111827", light: "#ffffff" },
        });
        return [table.id, dataUrl] as const;
      }),
    )
      .then((entries) => {
        if (active) setQrImages(Object.fromEntries(entries));
      })
      .catch(() => {
        if (active) {
          setQrImages({});
          setQrError("Không tạo được mã QR. Kiểm tra NEXT_PUBLIC_SITE_URL.");
        }
      });

    return () => {
      active = false;
    };
    // tableKey đổi khi thêm/xoá/đổi mã bàn; name không ảnh hưởng nội dung QR.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey, storeSlug]);

  const qrReady = tables.length > 0 && tables.every((table) => Boolean(qrImages[table.id]));

  function run(action: () => Promise<ActionResult>, success: string, reset?: () => void) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage(success);
      reset?.();
      router.refresh();
    });
  }

  function submitTable(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    run(
      () =>
        saveTable({
          id,
          table_code: String(data.get("table_code") ?? ""),
          name: String(data.get("name") ?? ""),
          active: data.get("active") === "on",
        }),
      id ? "Đã cập nhật bàn." : "Đã thêm bàn.",
      id ? undefined : () => form.reset(),
    );
  }

  function removeTable(table: DiningTableView) {
    if (!window.confirm(`Xoá bàn "${table.name}" (${table.table_code})?`)) return;
    run(() => deleteTable(table.id), "Đã xoá bàn.");
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #qr-print-sheet, #qr-print-sheet * { visibility: visible !important; }
          #qr-print-sheet {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: #fff;
          }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}
      {qrError ? <Notice tone="error">{qrError}</Notice> : null}

      <div style={{ ...rowStyle, justifyContent: "space-between" }}>
        <div style={mutedStyle}>
          QR mở đúng bàn cho khách quét món. In tất cả QR trên một trang A4.
        </div>
        <button
          type="button"
          style={secondaryButtonStyle}
          disabled={!qrReady}
          onClick={() => window.print()}
        >
          {qrReady ? "In tất cả QR" : "Đang tạo QR..."}
        </button>
      </div>

      {canEdit ? (
        <form onSubmit={(event) => submitTable(event)} style={{ ...cardStyle, ...gridStyle }}>
          <label style={labelStyle}>
            Mã bàn
            <input
              name="table_code"
              style={inputStyle}
              required
              pattern="[A-Za-z0-9_-]{1,32}"
              placeholder="VD: T01 hoặc chung"
            />
          </label>
          <label style={labelStyle}>
            Tên bàn
            <input name="name" style={inputStyle} required placeholder="VD: Bàn 1" />
          </label>
          <label style={{ ...labelStyle, alignSelf: "end", paddingBottom: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input name="active" type="checkbox" defaultChecked />
              Đang dùng
            </span>
          </label>
          <div style={{ alignSelf: "end" }}>
            <button type="submit" style={buttonStyle} disabled={pending}>
              Thêm bàn
            </button>
          </div>
        </form>
      ) : null}

      {tables.length === 0 ? (
        <EmptyState>Chưa có bàn. {canEdit ? "Thêm bàn ở trên để tạo QR." : ""}</EmptyState>
      ) : (
        <div style={gridStyle}>
          {tables.map((table) => (
            <div key={table.id} style={{ ...cardStyle, display: "grid", gap: 10 }}>
              <div style={{ ...rowStyle, justifyContent: "space-between" }}>
                <div>
                  <strong style={{ fontSize: 16 }}>{table.name}</strong>
                  <div style={mutedStyle}>
                    Mã: <code>{table.table_code}</code> ·{" "}
                    {table.active ? "Đang dùng" : "Tạm ẩn"}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 7px",
                    borderRadius: 99,
                    background: table.active ? colors.brandSoft : colors.dangerSoft,
                    color: table.active ? colors.brand : colors.danger,
                  }}
                >
                  {table.active ? "ACTIVE" : "OFF"}
                </span>
              </div>

              <div style={{ display: "grid", placeItems: "center", minHeight: 168 }}>
                {qrImages[table.id] ? (
                  <img
                    src={qrImages[table.id]}
                    alt={`QR ${table.name}`}
                    width={160}
                    height={160}
                    style={{ display: "block" }}
                  />
                ) : (
                  <span style={mutedStyle}>Đang tạo QR...</span>
                )}
              </div>

              <div style={{ ...mutedStyle, wordBreak: "break-all" }}>
                {buildTablePath(storeSlug, table.table_code)}
              </div>

              <div style={{ ...rowStyle }}>
                {qrImages[table.id] ? (
                  <a
                    href={qrImages[table.id]}
                    download={`${storeSlug}-${table.table_code}.png`}
                    style={{ ...buttonStyle, padding: "6px 10px", fontSize: 13 }}
                  >
                    Tải PNG
                  </a>
                ) : null}
              </div>

              {canEdit ? (
                <details>
                  <summary style={{ color: colors.brand, fontWeight: 600, fontSize: 14 }}>
                    Sửa bàn
                  </summary>
                  <form
                    key={`${table.id}-${table.table_code}-${table.name}-${table.active}`}
                    onSubmit={(event) => submitTable(event, table.id)}
                    style={{ ...gridStyle, marginTop: 10 }}
                  >
                    <label style={labelStyle}>
                      Mã bàn
                      <input
                        name="table_code"
                        defaultValue={table.table_code}
                        style={inputStyle}
                        required
                        pattern="[A-Za-z0-9_-]{1,32}"
                      />
                    </label>
                    <label style={labelStyle}>
                      Tên bàn
                      <input name="name" defaultValue={table.name} style={inputStyle} required />
                    </label>
                    <label style={{ ...labelStyle, alignSelf: "end", paddingBottom: 8 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input name="active" type="checkbox" defaultChecked={table.active} />
                        Đang dùng
                      </span>
                    </label>
                    <div style={{ ...rowStyle, alignSelf: "end" }}>
                      <button type="submit" style={buttonStyle} disabled={pending}>
                        Lưu
                      </button>
                      <button
                        type="button"
                        style={dangerButtonStyle}
                        disabled={pending}
                        onClick={() => removeTable(table)}
                      >
                        Xoá bàn
                      </button>
                    </div>
                  </form>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div id="qr-print-sheet" style={{ display: "none" }}>
        <div style={{ textAlign: "center", marginBottom: "6mm" }}>
          <h1 style={{ margin: 0, fontSize: "18pt" }}>{storeName}</h1>
          <p style={{ margin: "2mm 0 0", fontSize: "10pt", color: "#444" }}>
            Quét mã QR để xem thực đơn và đặt món
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "6mm",
          }}
        >
          {tables.map((table) => (
            <div
              key={table.id}
              style={{
                border: "1px solid #d0d5dd",
                borderRadius: "3mm",
                padding: "4mm",
                textAlign: "center",
                pageBreakInside: "avoid",
                breakInside: "avoid",
              }}
            >
              {qrImages[table.id] ? (
                <img
                  src={qrImages[table.id]}
                  alt={`QR ${table.name}`}
                  style={{ display: "block", width: "42mm", height: "42mm", margin: "0 auto" }}
                />
              ) : null}
              <div style={{ marginTop: "2mm", fontWeight: 700, fontSize: "12pt" }}>
                {table.name}
              </div>
              <div style={{ fontSize: "9pt", color: "#555" }}>Mã bàn: {table.table_code}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
