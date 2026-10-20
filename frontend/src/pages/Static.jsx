// Plain information pages. Details here are sample content from the brief and need the owner's approval.
const Page = ({ title, children }) => (
  <section className="page container" style={{ maxWidth: 760 }}>
    <h1>{title}</h1>
    {children}
  </section>
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
