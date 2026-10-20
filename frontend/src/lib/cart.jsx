import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

const KEY = 'eo_cart';
const FUL_KEY = 'eo_fulfilment';
const loadFul = () => {
  try {
    return localStorage.getItem(FUL_KEY) === 'delivery' ? 'delivery' : 'pickup';
  } catch {
    return 'pickup';
  }
};
const load = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(raw) ? raw.filter((l) => l && typeof l.id === 'string' && Number.isInteger(l.quantity)) : [];
  } catch {
    return [];
  }
};

// The cart only remembers which dishes and how many. Prices shown here are for display;
// the server prices the order again from the database at checkout.
export function CartProvider({ children }) {
  const [lines, setLines] = useState(load);
  const [fulfilment, setFulfilmentState] = useState(loadFul);
  const setFulfilment = (v) => {
    setFulfilmentState(v);
    try {
      localStorage.setItem(FUL_KEY, v);
    } catch {
      /* ignore blocked storage */
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* storage can be blocked; the cart then lasts for this visit only */
    }
  }, [lines]);

  const value = useMemo(
    () => ({
      lines,
      fulfilment,
      setFulfilment,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotalCents: lines.reduce((n, l) => n + l.priceCents * l.quantity, 0),
      add: (item) =>
        setLines((cur) => {
          const found = cur.find((l) => l.id === item._id);
          if (found) return cur.map((l) => (l.id === item._id ? { ...l, quantity: Math.min(l.quantity + 1, 20) } : l));
          return [...cur, { id: item._id, name: item.name, slug: item.slug, priceCents: item.priceCents, quantity: 1 }];
        }),
      setQuantity: (id, quantity) => setLines((cur) => (quantity < 1 ? cur.filter((l) => l.id !== id) : cur.map((l) => (l.id === id ? { ...l, quantity: Math.min(quantity, 20) } : l)))),
      clear: () => setLines([])
    }),
    [lines, fulfilment]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
