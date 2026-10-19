import 'dotenv/config';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';

const port = Number(process.env.PORT) || 5000;

await connectDb();
createApp().listen(port, () => console.log(`API listening on http://localhost:${port}`));
