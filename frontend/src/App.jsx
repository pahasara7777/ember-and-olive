import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Placeholder from './pages/Placeholder.jsx';

// Every route from the brief's sitemap. Swap a Placeholder for a real page as you build it.
const pages = [
  ['about', 'About Us'],
  ['menu', 'Menu'],
  ['gallery', 'Gallery'],
  ['reservations', 'Reservations'],
  ['order', 'Online Ordering'],
  ['events-catering', 'Events & Catering'],
  ['reviews', 'Reviews'],
  ['blog', 'Blog'],
  ['blog/:slug', 'Blog post'],
  ['contact', 'Contact'],
  ['cart', 'Cart'],
  ['checkout', 'Checkout'],
  ['order-tracking/:reference', 'Order tracking'],
  ['account', 'My account'],
  ['privacy', 'Privacy notice'],
  ['terms', 'Terms'],
  ['admin/*', 'Admin dashboard']
];

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        {pages.map(([path, title]) => (
          <Route key={path} path={path} element={<Placeholder title={title} />} />
        ))}
        <Route path="*" element={<Placeholder title="Page not found" />} />
      </Route>
    </Routes>
  );
}
