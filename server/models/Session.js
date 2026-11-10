import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

const Session =
  mongoose.models.Session || mongoose.model('Session', sessionSchema)

export default Session
