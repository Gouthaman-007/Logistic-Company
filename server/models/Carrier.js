import mongoose from 'mongoose'

const carrierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    serviceRegions: {
      type: [String],
      default: [],
    },
    serviceTypes: {
      type: [
        {
          type: String,
          enum: ['air', 'ground', 'ocean', 'rail'],
        },
      ],
      default: [],
    },
    onTimeRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

const Carrier =
  mongoose.models.Carrier || mongoose.model('Carrier', carrierSchema)

export default Carrier
