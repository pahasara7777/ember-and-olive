import { Setting } from '../models/index.js';

// The single settings document, created with its defaults the first time it is read.
export const getSettings = () => Setting.findOneAndUpdate({ key: 'main' }, { $setOnInsert: { key: 'main' } }, { upsert: true, returnDocument: 'after' }).lean();
