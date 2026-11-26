"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import {
  addStaffMember,
  resetStaffPassword,
  setStaffActive,
  updateStaffRole,
} from "@/app/(store)/dashboard/staff/actions";
import {
  ASSIGNABLE_STAFF_ROLES,
  ROLE_LABELS,
  type StaffRole,
} from "@/lib/permissions/roles";
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
  tableStyle,
  tdStyle,
  thStyle,
} from "./styles";
import { EmptyState, Notice } from "./ui";

export type StaffMemberView = {
  id: string;
  displayName: string | null;
  email: string | null;
  role: StaffRole;
  active: boolean;
  isSelf: boolean;
};

export function StaffManager({
  staff,
  canManage,
}: {
  staff: StaffMemberView[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

  function submitAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    run(
      () =>
        addStaffMember({
          email: String(data.get("email") ?? ""),
          displayName: String(data.get("display_name") ?? ""),
          role: String(data.get("role") ?? ""),
          password: String(data.get("password") ?? ""),
        }),
      "Đã thêm nhân viên.",
      () => form.reset(),
    );
  }

  function submitRole(event: FormEvent<HTMLFormElement>, member: StaffMemberView) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    run(
      () =>
        updateStaffRole({
          staffId: member.id,
          role: String(data.get("role") ?? ""),
        }),
      "Đã cập nhật vai trò.",
    );
  }

  function submitPassword(event: FormEvent<HTMLFormElement>, member: StaffMemberView) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    run(
      () =>
        resetStaffPassword({
          staffId: member.id,
          password: String(data.get("password") ?? ""),
        }),
      "Đã đặt lại mật khẩu.",
      () => form.reset(),
    );
  }

  function toggleActive(member: StaffMemberView) {
    const action = member.active ? "Tạm ngưng" : "Mở lại";
    const name = member.displayName || member.email || "nhân viên này";

    if (!window.confirm(`${action} quyền truy cập quán của ${name}?`)) {
      return;
    }

    run(
      () => setStaffActive({ staffId: member.id, active: !member.active }),
      member.active ? "Đã tạm ngưng quyền truy cập quán." : "Đã mở lại quyền truy cập quán.",
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}

      {canManage ? (
        <form onSubmit={submitAdd} style={{ ...cardStyle, ...gridStyle }}>
          <label style={labelStyle}>
            Email đăng nhập
            <input
              name="email"
              type="email"
              style={inputStyle}
              required
              autoComplete="off"
              placeholder="nhanvien@quan.vn"
            />
          </label>
          <label style={labelStyle}>
            Tên hiển thị
            <input name="display_name" style={inputStyle} required maxLength={120} placeholder="VD: Lan" />
          </label>
          <label style={labelStyle}>
            Vai trò
            <select name="role" style={inputStyle} defaultValue="waiter">
              {ASSIGNABLE_STAFF_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            Mật khẩu tạm
            <input
              name="password"
              type="password"
              style={inputStyle}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Ít nhất 6 ký tự"
            />
          </label>
          <div style={{ alignSelf: "end" }}>
            <button type="submit" style={buttonStyle} disabled={pending}>
              Thêm nhân viên
            </button>
          </div>
        </form>
      ) : (
        <Notice tone="info">
          Bạn chỉ có quyền xem danh sách nhân viên. Chỉ chủ quán được thêm, đổi vai trò,
          đặt lại mật khẩu và khoá/mở khoá.
        </Notice>
      )}

      {staff.length === 0 ? (
        <EmptyState>Chưa có nhân viên.</EmptyState>
      ) : (
        <div style={{ ...cardStyle, overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Nhân viên</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Vai trò</th>
                <th style={thStyle}>Trạng thái</th>
                {canManage ? <th style={thStyle}>Thao tác</th> : null}
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id}>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 600 }}>
                      {member.displayName || "Chưa đặt tên"}
                      {member.isSelf ? <span style={mutedStyle}> (bạn)</span> : null}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {member.email ||
                      (canManage ? "Không tải được email" : "Chỉ chủ quán xem email")}
                  </td>
                  <td style={tdStyle}>
                    {canManage && member.role !== "owner" && !member.isSelf ? (
                      <form
                        onSubmit={(event) => submitRole(event, member)}
                        style={rowStyle}
                      >
                        <select
                          name="role"
                          style={{ ...inputStyle, width: "auto" }}
                          defaultValue={member.role}
                          disabled={pending}
                        >
                          {ASSIGNABLE_STAFF_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </select>
                        <button type="submit" style={secondaryButtonStyle} disabled={pending}>
                          Lưu
                        </button>
                      </form>
                    ) : (
                      <span>{ROLE_LABELS[member.role]}</span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 8px",
                        borderRadius: 999,
                        background: member.active ? colors.successSoft : colors.dangerSoft,
                        color: member.active ? colors.brand : colors.danger,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {member.active ? "Đang hoạt động" : "Đã khoá"}
                    </span>
                  </td>
                  {canManage ? (
                    <td style={tdStyle}>
                      <div style={{ display: "grid", gap: 8 }}>
                        {member.isSelf || member.role === "owner" ? (
                          <span style={mutedStyle}>
                            {member.isSelf
                              ? "Không thể tự khoá hoặc tự đổi vai trò."
                              : "Không thể khoá chủ quán."}
                          </span>
                        ) : (
                          <button
                            type="button"
                            style={member.active ? dangerButtonStyle : secondaryButtonStyle}
                            disabled={pending}
                            onClick={() => toggleActive(member)}
                          >
                            {member.active ? "Khoá" : "Mở khoá"}
                          </button>
                        )}

                        <form
                          onSubmit={(event) => submitPassword(event, member)}
                          style={rowStyle}
                        >
                          <input
                            name="password"
                            type="password"
                            minLength={6}
                            required
                            autoComplete="new-password"
                            placeholder="Mật khẩu tạm mới"
                            style={{ ...inputStyle, width: 160 }}
                            disabled={pending}
                          />
                          <button type="submit" style={secondaryButtonStyle} disabled={pending}>
                            Đặt lại
                          </button>
                        </form>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
