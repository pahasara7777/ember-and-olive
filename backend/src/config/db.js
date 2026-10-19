import mongoose from 'mongoose';

export async function connectDb(uri = process.env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is not set. Copy backend/.env.example to backend/.env.');
  mongoose.set('strictQuery', true);
  mongoose.set('sanitizeFilter', true); // query operators from user input are treated as plain values
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);
  return mongoose.connection;
}
