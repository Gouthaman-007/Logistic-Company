import express from 'express'
import mongoose from 'mongoose'
import { Carrier, Shipment } from '../models/index.js'

const shipmentStatuses = [
  'on_track',
  'at_risk',
  'delayed',
  'delivered',
  'cancelled',
]
const maximumShipments = 100

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function createHttpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function validString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function createApp({
  CarrierModel = Carrier,
  ShipmentModel = Shipment,
  getDatabaseState = () => mongoose.connection.readyState,
} = {}) {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json({ limit: '16kb' }))

  app.get('/api/health', (request, response) => {
    const databaseConnected = getDatabaseState() === 1

    response.status(databaseConnected ? 200 : 503).json({
      status: databaseConnected ? 'ok' : 'database_disconnected',
      database: databaseConnected ? 'connected' : 'disconnected',
    })
  })

  app.get('/api/carriers', async (request, response) => {
    const carriers = await CarrierModel.find({ isActive: true })
      .select('name code')
      .sort({ name: 1 })
      .lean()

    response.json({ data: carriers })
  })

  app.get('/api/shipments', async (request, response) => {
    const { search, status } = request.query
    const filter = {}

    if (status) {
      if (!shipmentStatuses.includes(status)) {
        throw createHttpError(400, 'Invalid shipment status filter.')
      }

      filter.status = status
    }

    if (typeof search === 'string' && search.trim()) {
      const expression = new RegExp(escapeRegex(search.trim()), 'i')
      filter.$or = [
        { trackingNumber: expression },
        { customer: expression },
        { 'route.origin': expression },
        { 'route.destination': expression },
      ]
    }

    const shipments = await ShipmentModel.find(filter)
      .populate('carrier', 'name code')
      .sort({ createdAt: -1 })
      .limit(maximumShipments)
      .lean()

    response.json({ data: shipments })
  })

  app.post('/api/shipments', async (request, response) => {
    const {
      trackingNumber,
      customer,
      route,
      carrierId,
      estimatedDelivery,
    } = request.body ?? {}

    if (
      !validString(trackingNumber) ||
      !validString(customer) ||
      !route ||
      !validString(route.origin) ||
      !validString(route.destination) ||
      !validString(carrierId) ||
      !validString(estimatedDelivery)
    ) {
      throw createHttpError(
        400,
        'Tracking number, customer, route, carrier, and estimated delivery are required.',
      )
    }

    if (!mongoose.isValidObjectId(carrierId)) {
      throw createHttpError(400, 'Invalid carrier ID.')
    }

    const carrier = await CarrierModel.findOne({
      _id: carrierId,
      isActive: true,
    })

    if (!carrier) {
      throw createHttpError(404, 'Active carrier not found.')
    }

    const shipment = await ShipmentModel.create({
      trackingNumber,
      customer,
      route: {
        origin: route.origin,
        destination: route.destination,
      },
      carrier: carrier._id,
      estimatedDelivery,
    })
    const populatedShipment = await shipment.populate('carrier', 'name code')

    response.status(201).json({ data: populatedShipment })
  })

  app.use((request, response) => {
    response.status(404).json({ error: 'API route not found.' })
  })

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error)
      return
    }

    if (error.code === 11000) {
      response.status(409).json({
        error: 'A record with that unique value already exists.',
      })
      return
    }

    if (error instanceof mongoose.Error.ValidationError) {
      response.status(400).json({
        error: 'Shipment data failed validation.',
        details: Object.values(error.errors).map((validationError) => ({
          field: validationError.path,
          message: validationError.message,
        })),
      })
      return
    }

    if (error instanceof mongoose.Error.CastError) {
      response.status(400).json({ error: 'Invalid database identifier.' })
      return
    }

    if (error.status) {
      response.status(error.status).json({ error: error.message })
      return
    }

    console.error('Unhandled API error:', error)
    response.status(500).json({ error: 'An unexpected server error occurred.' })
  })

  return app
}
