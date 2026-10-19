import { Link } from 'react-router-dom';
import { useCart } from '../lib/cart.jsx';
import { formatLkr } from '../lib/api.js';

export default function Cart() {
  const cart = useCart();
  if (cart.lines.length === 0) {
    return (
      <section className="page container">
        <h1>Your order</h1>
        <p>Your cart is empty.</p>
        <Link to="/menu" className="btn btn-primary">Browse the menu</Link>
      </section>
    );
  }
  return (
    <section className="page container">
      <h1>Your order</h1>
      <ul className="lines">
        {cart.lines.map((l) => (
          <li key={l.id}>
            <span>{l.name}</span>
            <span className="qty">
              <button type="button" aria-label={`Remove one ${l.name}`} onClick={() => cart.setQuantity(l.id, l.quantity - 1)}>−</button>
              <output aria-label={`${l.name} quantity`}>{l.quantity}</output>
              <button type="button" aria-label={`Add one ${l.name}`} onClick={() => cart.setQuantity(l.id, l.quantity + 1)}>+</button>
            </span>
            <span>{formatLkr(l.priceCents * l.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="price">Subtotal {formatLkr(cart.subtotalCents)}</p>
      <p className="muted">Delivery fees and the final total are confirmed at checkout.</p>
      <Link to="/checkout" className="btn btn-primary">Checkout</Link>
    </section>
  );
}
