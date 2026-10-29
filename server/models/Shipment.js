import mongoose from 'mongoose'

const routeSchema = new mongoose.Schema(
  {
    origin: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false },
)

const trackingEventSchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: [
        'pickup',
        'origin_handling',
        'linehaul',
        'customs',
        'last_mile',
        'delivered',
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    occurredAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false },
)

const shipmentSchema = new mongoose.Schema(
  {
    trackingNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
    customer: {
      type: String,
      required: true,
      trim: true,
    },
    route: {
      type: routeSchema,
      required: true,
    },
    carrier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Carrier',
      required: true,
    },
    status: {
      type: String,
      enum: ['on_track', 'at_risk', 'delayed', 'delivered', 'cancelled'],
      default: 'on_track',
      required: true,
    },
    currentStage: {
      type: String,
      enum: [
        'pickup',
        'origin_handling',
        'linehaul',
        'customs',
        'last_mile',
        'delivered',
      ],
      default: 'origin_handling',
      required: true,
    },
    estimatedDelivery: {
      type: Date,
      required: true,
    },
    actualDelivery: {
      type: Date,
    },
    delayHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    trackingEvents: {
      type: [trackingEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

shipmentSchema.index({ status: 1, estimatedDelivery: 1 })
shipmentSchema.index({ carrier: 1, estimatedDelivery: 1 })

const Shipment =
  mongoose.models.Shipment || mongoose.model('Shipment', shipmentSchema)

export default Shipment
