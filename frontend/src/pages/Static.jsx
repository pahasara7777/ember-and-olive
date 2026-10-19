// Plain information pages. Details here are sample content from the brief and need the owner's approval.
const Page = ({ title, children }) => (
  <section className="page container narrow">
    <h1>{title}</h1>
    {children}
  </section>
);

export const About = () => (
  <Page title="About Us">
    <p>The Ember &amp; Olive is a neighbourhood Mediterranean restaurant in Colombo 07. We cook over charcoal, buy what is in season and keep the menu honest.</p>
    <p>Come for a long lunch, a quiet dinner, or a table full of friends.</p>
  </Page>
);

export const Contact = () => (
  <Page title="Contact">
    <p>42 Gregory's Road, Colombo 07</p>
    <p>Open Tuesday to Sunday. Lunch 12:00 to 15:00, dinner 18:00 to 22:30. Closed Mondays.</p>
    <p>For bookings use <a href="/reservations">online reservations</a>. For events and catering use <a href="/events-catering">our enquiry form</a>.</p>
  </Page>
);

export const Privacy = () => (
  <Page title="Privacy notice">
    <p>We collect the details you give us (name, email, phone, delivery address, booking and order information) to run your booking or order and to contact you about it.</p>
    <p>We only send offers if you opt in, and you can change that in your account. We never store card numbers. Passwords are stored as one-way hashes.</p>
    <p>To see, correct or delete your data, contact the restaurant. This is a summary; the owner must provide the final policy before launch.</p>
  </Page>
);

export const Terms = () => (
  <Page title="Terms">
    <p>Bookings are held for 15 minutes after the reserved time. Please cancel online if your plans change.</p>
    <p>Prices are in Sri Lankan rupees. Tell us about allergies when you order and confirm with the team; we cannot guarantee any dish is free of allergens.</p>
    <p>This is sample text. The owner must provide the final terms before launch.</p>
  </Page>
);
