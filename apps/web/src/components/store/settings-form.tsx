"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { saveStoreSettings } from "@/app/(store)/dashboard/settings/actions";

import {
  buttonStyle,
  cardStyle,
  gridStyle,
  inputStyle,
  labelStyle,
  mutedStyle,
} from "./styles";
import { Notice } from "./ui";

export type StoreProfileView = {
  displayName: string;
  address: string;
  phone: string;
  openingHours: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ ...mutedStyle, fontSize: 12 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value || "—"}</div>
    </div>
  );
}

export function SettingsForm({
  initial,
  canEdit,
}: {
  initial: StoreProfileView;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await saveStoreSettings({
        displayName: String(data.get("display_name") ?? ""),
        address: String(data.get("address") ?? ""),
        phone: String(data.get("phone") ?? ""),
        openingHours: String(data.get("opening_hours") ?? ""),
        bankName: String(data.get("bank_name") ?? ""),
        bankAccountNumber: String(data.get("bank_account_number") ?? ""),
        bankAccountHolder: String(data.get("bank_account_holder") ?? ""),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setMessage("Đã lưu thông tin quán.");
      router.refresh();
    });
  }

  if (!canEdit) {
    return (
      <div style={{ ...cardStyle, display: "grid", gap: 16 }}>
        <div style={gridStyle}>
          <ReadOnlyField label="Tên hiển thị" value={initial.displayName} />
          <ReadOnlyField label="Địa chỉ" value={initial.address} />
          <ReadOnlyField label="Số điện thoại" value={initial.phone} />
          <ReadOnlyField label="Giờ mở cửa" value={initial.openingHours} />
          <ReadOnlyField label="Ngân hàng" value={initial.bankName} />
          <ReadOnlyField label="Số tài khoản" value={initial.bankAccountNumber} />
          <ReadOnlyField label="Chủ tài khoản" value={initial.bankAccountHolder} />
        </div>
        <div style={mutedStyle}>Chỉ chủ quán được sửa thông tin quán.</div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ ...cardStyle, display: "grid", gap: 16 }}>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}

      <div style={gridStyle}>
        <label style={labelStyle}>
          Tên hiển thị
          <input
            name="display_name"
            style={inputStyle}
            defaultValue={initial.displayName}
            required
            maxLength={120}
          />
        </label>
        <label style={labelStyle}>
          Địa chỉ
          <input
            name="address"
            style={inputStyle}
            defaultValue={initial.address}
            maxLength={255}
          />
        </label>
        <label style={labelStyle}>
          Số điện thoại
          <input
            name="phone"
            style={inputStyle}
            defaultValue={initial.phone}
            maxLength={50}
          />
        </label>
      </div>

      <label style={labelStyle}>
        Giờ mở cửa
        <textarea
          name="opening_hours"
          style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
          defaultValue={initial.openingHours}
          maxLength={500}
          placeholder="VD: 07:00 - 22:00 hằng ngày"
        />
      </label>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>Thông tin chuyển khoản</div>
        <div style={gridStyle}>
          <label style={labelStyle}>
            Ngân hàng
            <input
              name="bank_name"
              style={inputStyle}
              defaultValue={initial.bankName}
              maxLength={120}
            />
          </label>
          <label style={labelStyle}>
            Số tài khoản
            <input
              name="bank_account_number"
              style={inputStyle}
              defaultValue={initial.bankAccountNumber}
              maxLength={50}
            />
          </label>
          <label style={labelStyle}>
            Chủ tài khoản
            <input
              name="bank_account_holder"
              style={inputStyle}
              defaultValue={initial.bankAccountHolder}
              maxLength={120}
            />
          </label>
        </div>
      </div>

      <div>
        <button type="submit" style={buttonStyle} disabled={pending}>
          Lưu thông tin
        </button>
      </div>
    </form>
  );
}
