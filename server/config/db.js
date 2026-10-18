import mongoose from 'mongoose';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/subscription_support_desk';
  await mongoose.connect(uri);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
