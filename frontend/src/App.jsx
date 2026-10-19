import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { RequireAuth, RequireStaff } from './components/Guards.jsx';
import Home from './pages/Home.jsx';
import Menu from './pages/Menu.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderTracking from './pages/OrderTracking.jsx';
import Reservations from './pages/Reservations.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Account from './pages/Account.jsx';
import Reviews from './pages/Reviews.jsx';
import Events from './pages/Events.jsx';
import Gallery from './pages/Gallery.jsx';
import Admin from './pages/Admin.jsx';
import Placeholder from './pages/Placeholder.jsx';
import { About, Contact, Privacy, Terms } from './pages/Static.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="menu" element={<Menu />} />
        <Route path="order" element={<Menu />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="reservations" element={<Reservations />} />
        <Route path="events-catering" element={<Events />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="contact" element={<Contact />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order-tracking/:reference" element={<OrderTracking />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="account" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="admin" element={<RequireStaff><Admin /></RequireStaff>} />
        <Route path="privacy" element={<Privacy />} />
        <Route path="terms" element={<Terms />} />
        <Route path="blog" element={<Placeholder title="Blog" />} />
        <Route path="*" element={<Placeholder title="Page not found" />} />
      </Route>
    </Routes>
  );
}
