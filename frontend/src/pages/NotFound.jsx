import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="page container">
      <p className="eyebrow">404</p>
      <h1>We can't find that page</h1>
      <p style={{ margin: '12px 0 24px' }}>The link may be old or mistyped.</p>
      <Link to="/" className="btn btn-primary">Back to the home page</Link>
    </section>
  );
}
