import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { productsQueryOptions } from "./catalog";
import type { Product, Size } from "./products";

export type CartItem = {
  slug: string;
  size: Size;
  qty: number;
};

type CartCtx = {
  items: CartItem[];
  add: (slug: string, size: Size, qty?: number) => void;
  remove: (slug: string, size: Size) => void;
  setQty: (slug: string, size: Size, qty: number) => void;
  changeSize: (slug: string, oldSize: Size, newSize: Size) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  hydrated: boolean;
  getProduct: (slug: string) => Product | undefined;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "phsports.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const { data: products = [] } = useQuery(productsQueryOptions);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const add: CartCtx["add"] = (slug, size, qty = 1) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.slug === slug && x.size === size);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + qty };
        return next;
      }
      return [...prev, { slug, size, qty }];
    });
  };
  const remove: CartCtx["remove"] = (slug, size) =>
    setItems((prev) => prev.filter((x) => !(x.slug === slug && x.size === size)));
  const setQty: CartCtx["setQty"] = (slug, size, qty) =>
    setItems((prev) =>
      prev
        .map((x) => (x.slug === slug && x.size === size ? { ...x, qty: Math.max(1, qty) } : x))
        .filter((x) => x.qty > 0),
    );
  const changeSize: CartCtx["changeSize"] = (slug, oldSize, newSize) => {
    if (oldSize === newSize) return;
    setItems((prev) => {
      const current = prev.find((x) => x.slug === slug && x.size === oldSize);
      if (!current) return prev;
      const existing = prev.find((x) => x.slug === slug && x.size === newSize);
      if (existing) {
        return prev
          .map((x) =>
            x.slug === slug && x.size === newSize ? { ...x, qty: x.qty + current.qty } : x,
          )
          .filter((x) => !(x.slug === slug && x.size === oldSize));
      }
      return prev.map((x) =>
        x.slug === slug && x.size === oldSize ? { ...x, size: newSize } : x,
      );
    });
  };
  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const getProduct = (slug: string) => products.find((p) => p.slug === slug);
  const subtotal = items.reduce((s, i) => {
    const p = getProduct(i.slug);
    return s + (p ? p.price * i.qty : 0);
  }, 0);

  return (
    <Ctx.Provider value={{ items, add, remove, setQty, changeSize, clear, count, subtotal, hydrated, getProduct }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside provider");
  return c;
}
