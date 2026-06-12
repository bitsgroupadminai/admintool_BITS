import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../logger/index.js';

/**
 * Connect to MongoDB
 * @returns {Promise<void>}
 */
export async function connectDb() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  logger.info('MongoDB connected');
}
