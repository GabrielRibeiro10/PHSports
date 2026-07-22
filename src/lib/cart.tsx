import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { products, type Product, type Size } from "./products";

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
  clear: () => void;
  count: number;
  subtotal: number;
  hydrated: boolean;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "phsports.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

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
  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => {
    const p = products.find((pr) => pr.slug === i.slug);
    return s + (p ? p.price * i.qty : 0);
  }, 0);

  return (
    <Ctx.Provider value={{ items, add, remove, setQty, clear, count, subtotal, hydrated }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart outside provider");
  return c;
}

export function itemProduct(item: CartItem): Product | undefined {
  return products.find((p) => p.slug === item.slug);
}
