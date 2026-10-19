import dns from 'node:dns';
import mongoose from 'mongoose';

// Some routers and phone hotspots cannot answer the SRV lookup that mongodb+srv:// needs (error: querySrv EBADRESP).
// Setting DNS_SERVERS=8.8.8.8,1.1.1.1 in backend/.env makes the API use public DNS for that lookup.
function useCustomDns(list = process.env.DNS_SERVERS) {
  const servers = (list ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (servers.length) dns.setServers(servers); // throws on an invalid address
}

export async function connectDb(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is not set. Copy backend/.env.example to backend/.env.');
  useCustomDns();
  mongoose.set('strictQuery', true);
  mongoose.set('sanitizeFilter', true); // query operators from user input are treated as plain values
  await mongoose.connect(uri);
  // Unique indexes (emails, references, idempotency keys) must exist before we accept traffic.
  await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).init()));
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  return mongoose.connection;
}
