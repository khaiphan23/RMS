"use client";

import Link from "next/link";
import { useCart } from "./cart-context";
import { currency, type TableMenu } from "./types";
import styles from "./customer.module.css";

function safeImageUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export function Menu({ menu, tablePath }: { menu: TableMenu; tablePath: string }) {
  const { cart, ready, add } = useCart();
  const quantity = cart.lines.reduce((total, line) => total + line.quantity, 0);

  return (
    <>
      <nav className={styles.row} aria-label="Đặt món">
        <Link href={`${tablePath}/order-status`}>Đơn gần nhất</Link>
        <Link className={styles.button} href={`${tablePath}/cart`}>Giỏ hàng ({quantity})</Link>
      </nav>
      <header>
        <h1>{menu.store_name}</h1>
        <p>{menu.table_name}</p>
      </header>
      {!menu.categories.some((category) => category.items.length > 0) && <p>Quán chưa có món trong thực đơn.</p>}
      {menu.categories.filter((category) => category.items.length > 0).map((category) => (
        <section key={category.id}>
          <h2>{category.name}</h2>
          <div className={styles.grid}>
            {category.items.map((item) => {
              const imageUrl = safeImageUrl(item.image_url);
              const line = cart.lines.find((entry) => entry.id === item.id);
              const atLimit = line ? line.quantity >= 20 : cart.lines.length >= 30;
              return (
                <article className={styles.card} key={item.id}>
                  <div className={styles.image}>
                    {imageUrl ? <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      : <span>Chưa có ảnh</span>}
                  </div>
                  <h3>{item.name}</h3>
                  {item.description && <p>{item.description}</p>}
                  <div className={styles.row}>
                    <strong>{currency.format(item.price_vnd)}</strong>
                    <button className={styles.button} type="button" disabled={!ready || !item.available || atLimit}
                      onClick={() => add(item)}>
                      {!item.available ? "Hết món" : atLimit ? "Đã đạt giới hạn" : "Thêm vào giỏ"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
