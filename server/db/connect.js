import mongoose from 'mongoose'

export async function connectToDatabase(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is required to start the API.')
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
  return mongoose.connection
}
