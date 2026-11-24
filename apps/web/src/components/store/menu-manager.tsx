"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import {
  deleteCategory,
  deleteItem,
  saveCategory,
  saveItem,
} from "@/app/(store)/dashboard/menu/actions";
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
} from "./styles";
import { EmptyState, Notice } from "./ui";

export type MenuCategoryView = {
  id: string;
  name: string;
  sort_order: number;
  active: boolean;
};

export type MenuItemView = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_vnd: number;
  available: boolean;
  sort_order: number;
};

function formatVnd(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(value)}₫`;
}

export function MenuManager({
  categories,
  items,
  canEdit,
}: {
  categories: MenuCategoryView[];
  items: MenuItemView[];
  canEdit: boolean;
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

  function submitCategory(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    run(
      () =>
        saveCategory({
          id,
          name: String(data.get("name") ?? ""),
          sort_order: Number(data.get("sort_order") ?? 0),
          active: data.get("active") === "on",
        }),
      id ? "Đã cập nhật nhóm món." : "Đã thêm nhóm món.",
      id ? undefined : () => form.reset(),
    );
  }

  function submitItem(event: FormEvent<HTMLFormElement>, id?: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    run(
      () =>
        saveItem({
          id,
          category_id: String(data.get("category_id") ?? ""),
          name: String(data.get("name") ?? ""),
          description: String(data.get("description") ?? ""),
          price_vnd: Number(data.get("price_vnd") ?? 0),
          available: data.get("available") === "on",
          sort_order: Number(data.get("sort_order") ?? 0),
        }),
      id ? "Đã cập nhật món." : "Đã thêm món.",
      id ? undefined : () => form.reset(),
    );
  }

  function removeCategory(category: MenuCategoryView) {
    if (!window.confirm(`Xoá nhóm "${category.name}"?`)) return;
    run(() => deleteCategory(category.id), "Đã xoá nhóm món.");
  }

  function removeItem(item: MenuItemView) {
    if (!window.confirm(`Xoá món "${item.name}"?`)) return;
    run(() => deleteItem(item.id), "Đã xoá món.");
  }

  const categoryOptions = categories.map((category) => (
    <option key={category.id} value={category.id}>
      {category.name}
    </option>
  ));

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {message ? <Notice tone="success">{message}</Notice> : null}

      {canEdit ? (
        <form onSubmit={(event) => submitCategory(event)} style={{ ...cardStyle, ...gridStyle }}>
          <label style={labelStyle}>
            Tên nhóm món
            <input name="name" style={inputStyle} required placeholder="VD: Món chính" />
          </label>
          <label style={labelStyle}>
            Thứ tự
            <input
              name="sort_order"
              type="number"
              step={1}
              defaultValue={0}
              style={inputStyle}
            />
          </label>
          <label style={{ ...labelStyle, alignSelf: "end", paddingBottom: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input name="active" type="checkbox" defaultChecked />
              Đang hiện
            </span>
          </label>
          <div style={{ alignSelf: "end" }}>
            <button type="submit" style={buttonStyle} disabled={pending}>
              Thêm nhóm
            </button>
          </div>
        </form>
      ) : null}

      {categories.length === 0 ? (
        <EmptyState>Chưa có nhóm món. {canEdit ? "Thêm nhóm ở trên để bắt đầu." : ""}</EmptyState>
      ) : null}

      {categories.map((category) => {
        const categoryItems = items.filter((item) => item.category_id === category.id);

        return (
          <section key={category.id} style={{ ...cardStyle, display: "grid", gap: 12 }}>
            <div style={{ ...rowStyle, justifyContent: "space-between" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>{category.name}</h2>
                <div style={{ ...mutedStyle, marginTop: 2 }}>
                  Thứ tự {category.sort_order} · {category.active ? "Đang hiện" : "Đang ẩn"} ·{" "}
                  {categoryItems.length} món
                </div>
              </div>
            </div>

            {canEdit ? (
              <details>
                <summary style={{ color: colors.brand, fontWeight: 600, fontSize: 14 }}>
                  Sửa nhóm
                </summary>
                <form
                  key={`${category.id}-${category.name}-${category.sort_order}-${category.active}`}
                  onSubmit={(event) => submitCategory(event, category.id)}
                  style={{ ...gridStyle, marginTop: 10 }}
                >
                  <label style={labelStyle}>
                    Tên nhóm
                    <input name="name" defaultValue={category.name} style={inputStyle} required />
                  </label>
                  <label style={labelStyle}>
                    Thứ tự
                    <input
                      name="sort_order"
                      type="number"
                      step={1}
                      defaultValue={category.sort_order}
                      style={inputStyle}
                    />
                  </label>
                  <label style={{ ...labelStyle, alignSelf: "end", paddingBottom: 8 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input name="active" type="checkbox" defaultChecked={category.active} />
                      Đang hiện
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
                      onClick={() => removeCategory(category)}
                    >
                      Xoá nhóm
                    </button>
                  </div>
                </form>
              </details>
            ) : null}

            {categoryItems.length === 0 ? (
              <EmptyState>Nhóm này chưa có món.</EmptyState>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      border: `1px solid ${colors.line}`,
                      borderRadius: 10,
                      padding: 12,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ ...rowStyle, justifyContent: "space-between" }}>
                      <div>
                        <strong>{item.name}</strong>
                        <div style={mutedStyle}>{item.description || "Chưa có mô tả"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <strong>{formatVnd(item.price_vnd)}</strong>
                        <div style={mutedStyle}>{item.available ? "Đang bán" : "Tạm ẩn"}</div>
                      </div>
                    </div>

                    {canEdit ? (
                      <details>
                        <summary style={{ color: colors.brand, fontWeight: 600, fontSize: 14 }}>
                          Sửa món
                        </summary>
                        <form
                          key={`${item.id}-${item.name}-${item.price_vnd}-${item.category_id}-${item.available}-${item.sort_order}`}
                          onSubmit={(event) => submitItem(event, item.id)}
                          style={{ ...gridStyle, marginTop: 10 }}
                        >
                          <label style={labelStyle}>
                            Tên món
                            <input name="name" defaultValue={item.name} style={inputStyle} required />
                          </label>
                          <label style={labelStyle}>
                            Giá VND
                            <input
                              name="price_vnd"
                              type="number"
                              min={0}
                              step={1}
                              defaultValue={item.price_vnd}
                              style={inputStyle}
                              required
                            />
                          </label>
                          <label style={labelStyle}>
                            Nhóm món
                            <select
                              name="category_id"
                              defaultValue={item.category_id}
                              style={inputStyle}
                            >
                              {categoryOptions}
                            </select>
                          </label>
                          <label style={labelStyle}>
                            Thứ tự
                            <input
                              name="sort_order"
                              type="number"
                              step={1}
                              defaultValue={item.sort_order}
                              style={inputStyle}
                            />
                          </label>
                          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
                            Mô tả
                            <textarea
                              name="description"
                              defaultValue={item.description ?? ""}
                              style={{ ...inputStyle, minHeight: 64 }}
                            />
                          </label>
                          <label style={{ ...labelStyle, alignSelf: "end", paddingBottom: 8 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <input name="available" type="checkbox" defaultChecked={item.available} />
                              Đang bán
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
                              onClick={() => removeItem(item)}
                            >
                              Xoá món
                            </button>
                          </div>
                        </form>
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {canEdit && categories.length > 0 ? (
        <form
          onSubmit={(event) => submitItem(event)}
          style={{ ...cardStyle, display: "grid", gap: 12 }}
        >
          <h2 style={{ margin: 0, fontSize: 18 }}>Thêm món</h2>
          <div style={gridStyle}>
            <label style={labelStyle}>
              Tên món
              <input name="name" style={inputStyle} required placeholder="VD: Phở bò" />
            </label>
            <label style={labelStyle}>
              Giá VND
              <input
                name="price_vnd"
                type="number"
                min={0}
                step={1}
                style={inputStyle}
                required
              />
            </label>
            <label style={labelStyle}>
              Nhóm món
              <select name="category_id" style={inputStyle} defaultValue={categories[0]?.id}>
                {categoryOptions}
              </select>
            </label>
            <label style={labelStyle}>
              Thứ tự
              <input name="sort_order" type="number" step={1} defaultValue={0} style={inputStyle} />
            </label>
            <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
              Mô tả
              <textarea name="description" style={{ ...inputStyle, minHeight: 64 }} />
            </label>
            <label style={{ ...labelStyle, alignSelf: "end", paddingBottom: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input name="available" type="checkbox" defaultChecked />
                Đang bán
              </span>
            </label>
          </div>
          <div>
            <button type="submit" style={buttonStyle} disabled={pending}>
              Thêm món
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
