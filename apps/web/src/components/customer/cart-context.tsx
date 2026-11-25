"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { MenuItem } from "./types";

type CartLine = Pick<MenuItem, "id" | "name" | "price_vnd"> & { quantity: number };
type Cart = { lines: CartLine[]; note: string };
type CartContext = {
  cart: Cart;
  ready: boolean;
  add: (item: MenuItem) => void;
  setQuantity: (id: string, quantity: number) => void;
  setNote: (note: string) => void;
  clear: () => void;
};

const empty: Cart = { lines: [], note: "" };
const Context = createContext<CartContext | null>(null);

function readCart(key: string): Cart {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null") as Cart | null;
    if (!saved || !Array.isArray(saved.lines)) return empty;
    return {
      lines: saved.lines.filter((line) =>
        line && typeof line.id === "string" && typeof line.name === "string" &&
        Number.isSafeInteger(line.price_vnd) && line.price_vnd >= 0 &&
        Number.isInteger(line.quantity) && line.quantity >= 1 && line.quantity <= 20
      ).slice(0, 30),
      note: typeof saved.note === "string" ? saved.note.slice(0, 300) : "",
    };
  } catch {
    return empty;
  }
}

export function CartProvider({ tablePath, children }: { tablePath: string; children: ReactNode }) {
  const key = `microbiz:cart:${tablePath}`;
  const [cart, setCart] = useState<Cart>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCart(readCart(key));
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(cart));
    } catch {
      // Cart stays usable in memory when storage is unavailable.
    }
  }, [cart, key, ready]);

  function add(item: MenuItem) {
    if (!item.available) return;
    setCart((current) => {
      const existing = current.lines.find((line) => line.id === item.id);
      if (existing) {
        return {
          ...current,
          lines: current.lines.map((line) => line.id === item.id
            ? { ...line, name: item.name, price_vnd: item.price_vnd, quantity: Math.min(20, line.quantity + 1) }
            : line),
        };
      }
      if (current.lines.length >= 30) return current;
      return {
        ...current,
        lines: [...current.lines, { id: item.id, name: item.name, price_vnd: item.price_vnd, quantity: 1 }],
      };
    });
  }

  function setQuantity(id: string, quantity: number) {
    setCart((current) => ({
      ...current,
      lines: quantity <= 0
        ? current.lines.filter((line) => line.id !== id)
        : current.lines.map((line) => line.id === id ? { ...line, quantity: Math.min(quantity, 20) } : line),
    }));
  }

  return (
    <Context.Provider value={{
      cart,
      ready,
      add,
      setQuantity,
      setNote: (note) => setCart((current) => ({ ...current, note })),
      clear: () => setCart(empty),
    }}>
      {children}
    </Context.Provider>
  );
}

export function useCart() {
  const context = useContext(Context);
  if (!context) throw new Error("Thiếu giỏ hàng của bàn.");
  return context;
}

export function orderTokenKey(tablePath: string) {
  return `microbiz:last-order:${tablePath}`;
}
