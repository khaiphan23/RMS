"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { buildTablePath } from "@/lib/qr/links";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { orderTokenKey, useCart } from "./cart-context";
import { currency, type TableRoute } from "./types";
import styles from "./customer.module.css";

function newOrderToken() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  // QR demo on a phone can use HTTP over the local network.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

export function Cart({ storeSlug, tableCode }: TableRoute) {
  const { cart, ready, setQuantity, setNote, clear } = useCart();
  const router = useRouter();
  const sending = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const path = buildTablePath(storeSlug, tableCode);
  const total = cart.lines.reduce((sum, line) => sum + line.price_vnd * line.quantity, 0);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current || !cart.lines.length) return;
    sending.current = true;
    setPending(true);
    setError("");

    try {
      const token = newOrderToken();
      const { error: rpcError } = await createBrowserSupabaseClient().rpc("place_order", {
        p_store_slug: storeSlug,
        p_table_code: tableCode,
        p_items: cart.lines.map(({ id, quantity }) => ({ menu_item_id: id, quantity })),
        p_note: cart.note.trim() || null,
        p_order_token: token,
      });
      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      try {
        localStorage.setItem(orderTokenKey(path), token);
      } catch {
        // The status URL still carries the token when storage is unavailable.
      }

      clear();
      router.replace(`${path}/order-status?token=${encodeURIComponent(token)}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không gửi được đơn. Vui lòng thử lại.");
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <Link href={`${path}/menu`}>← Về thực đơn</Link>
      <h1>Giỏ hàng</h1>
      {!ready ? <p>Đang tải giỏ hàng…</p> : cart.lines.length === 0 ? <p>Giỏ hàng đang trống.</p> : (
        <form onSubmit={submit}>
          {cart.lines.map((line) => (
            <article className={styles.card} key={line.id}>
              <div className={styles.row}>
                <strong>{line.name}</strong>
                <span>{currency.format(line.price_vnd * line.quantity)}</span>
              </div>
              <p>{currency.format(line.price_vnd)} / phần</p>
              <div className={styles.controls}>
                <button type="button" disabled={pending || line.quantity === 1} aria-label={`Giảm số lượng ${line.name}`}
                  onClick={() => setQuantity(line.id, line.quantity - 1)}>−</button>
                <span aria-live="polite">{line.quantity}</span>
                <button type="button" disabled={pending || line.quantity >= 20} aria-label={`Tăng số lượng ${line.name}`}
                  onClick={() => setQuantity(line.id, line.quantity + 1)}>+</button>
                <button type="button" disabled={pending} onClick={() => setQuantity(line.id, 0)}>Xoá</button>
              </div>
            </article>
          ))}
          <label htmlFor="order-note">Ghi chú cho đơn</label>
          <textarea id="order-note" maxLength={300} disabled={pending} value={cart.note}
            onChange={(event) => setNote(event.target.value)} />
          <p>Tạm tính <strong>{currency.format(total)}</strong></p>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button className={styles.button} disabled={pending} type="submit">
            {pending ? "Đang gửi đơn…" : "Gửi đơn"}
          </button>
        </form>
      )}
    </>
  );
}
