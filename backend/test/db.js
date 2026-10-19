import mongoose from 'mongoose';

// Database tests run only when MONGODB_TEST_URI is set (a local mongod, FerretDB or a throwaway Atlas cluster).
// Each test file gets its own database named eo-test-<name>, so the URI's own database is never touched.
export const HAS_DB = Boolean(process.env.MONGODB_TEST_URI);

export async function connectTestDb(name) {
  mongoose.set('strictQuery', true);
  mongoose.set('sanitizeFilter', true);
  await mongoose.connect(process.env.MONGODB_TEST_URI, { dbName: `eo-test-${name}` });
  await mongoose.connection.dropDatabase();
}

export async function disconnectTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
