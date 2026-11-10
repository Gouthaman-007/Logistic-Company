import express from 'express'
import mongoose from 'mongoose'
import { Carrier, Session, Shipment, User } from '../models/index.js'
import {
  accessTokenLifetimeSeconds,
  assertJwtSecret,
  clearAccessTokenCookie,
  createAccessToken,
  hashJwtId,
  readAccessToken,
  setAccessTokenCookie,
  verifyAccessToken,
} from '../auth/jwt.js'
import {
  clearGoogleOAuthStateCookie,
  createGoogleAuthorizationUrl,
  createGoogleOAuthState,
  exchangeGoogleCode,
  isGoogleOAuthConfigured,
  matchesGoogleOAuthState,
  readGoogleOAuthState,
  setGoogleOAuthStateCookie,
  verifyGoogleIdentity,
} from '../auth/google.js'

const shipmentStatuses = [
  'on_track',
  'at_risk',
  'delayed',
  'delivered',
  'cancelled',
]
const shipmentStages = [
  'pickup',
  'origin_handling',
  'linehaul',
  'customs',
  'last_mile',
  'delivered',
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
  SessionModel = Session,
  ShipmentModel = Shipment,
  UserModel = User,
  jwtSecret = process.env.JWT_SECRET,
  googleOAuthConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    successRedirectUrl: process.env.GOOGLE_SUCCESS_REDIRECT_URL,
  },
  fetchImplementation = fetch,
  exchangeGoogleCodeImplementation = exchangeGoogleCode,
  verifyGoogleIdentityImplementation = verifyGoogleIdentity,
  getDatabaseState = () => mongoose.connection.readyState,
} = {}) {
  assertJwtSecret(jwtSecret)

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

  const authenticate = async (request, response, next) => {
    const token = readAccessToken(request)

    if (!token) {
      response.status(401).json({ error: 'Authentication required.' })
      return
    }

    const claims = verifyAccessToken(token, jwtSecret)

    if (!claims) {
      response.status(401).json({ error: 'Authentication required.' })
      return
    }

    const session = await SessionModel.findOne({
      user: claims.userId,
      tokenHash: hashJwtId(claims.jwtId),
      expiresAt: { $gt: new Date() },
    }).populate('user', 'username')

    if (!session?.user) {
      response.status(401).json({ error: 'Authentication required.' })
      return
    }

    request.authUser = {
      id: session.user._id.toString(),
      username: session.user.username,
    }
    next()
  }

  async function createAuthenticatedSession(user, response) {
    const { token, jwtId } = createAccessToken(user._id, jwtSecret)

    await SessionModel.create({
      user: user._id,
      tokenHash: hashJwtId(jwtId),
      expiresAt: new Date(Date.now() + accessTokenLifetimeSeconds * 1000),
    })
    setAccessTokenCookie(response, token)

    return {
      id: user._id.toString(),
      username: user.username,
    }
  }

  app.post('/api/auth/register', async (request, response) => {
    const { username, password } = request.body ?? {}
    const normalizedUsername =
      typeof username === 'string' ? username.trim().toLowerCase() : ''

    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalizedUsername)) {
      throw createHttpError(
        400,
        'Username must be 3-32 characters and use letters, numbers, dots, underscores, or hyphens.',
      )
    }

    if (
      typeof password !== 'string' ||
      password.length < 12 ||
      password.length > 128
    ) {
      throw createHttpError(400, 'Password must be between 12 and 128 characters.')
    }

    const user = await UserModel.createWithPassword(
      normalizedUsername,
      password,
    )
    const data = await createAuthenticatedSession(user, response)

    response.status(201).json({ data })
  })

  app.post('/api/auth/login', async (request, response) => {
    const { username, password } = request.body ?? {}

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password ||
      password.length > 128
    ) {
      throw createHttpError(400, 'Username and password are required.')
    }

    const user = await UserModel.findOne({
      username: username.trim().toLowerCase(),
    }).select('+passwordHash')

    if (!user || !(await user.verifyPassword(password))) {
      throw createHttpError(401, 'Invalid username or password.')
    }

    const data = await createAuthenticatedSession(user, response)

    response.json({ data })
  })

  app.get('/api/auth/providers', (request, response) => {
    response.json({
      data: { google: isGoogleOAuthConfigured(googleOAuthConfig) },
    })
  })

  app.get('/api/auth/google', (request, response) => {
    if (!isGoogleOAuthConfigured(googleOAuthConfig)) {
      response.status(503).json({
        error: 'Google sign-in is not configured on this server.',
      })
      return
    }

    const state = createGoogleOAuthState()
    setGoogleOAuthStateCookie(response, state)
    response.redirect(createGoogleAuthorizationUrl(googleOAuthConfig, state))
  })

  app.get('/api/auth/google/callback', async (request, response) => {
    if (!isGoogleOAuthConfigured(googleOAuthConfig)) {
      response.status(503).json({
        error: 'Google sign-in is not configured on this server.',
      })
      return
    }

    const savedState = readGoogleOAuthState(request)
    clearGoogleOAuthStateCookie(response)

    if (
      !savedState ||
      typeof request.query.state !== 'string' ||
      !matchesGoogleOAuthState(savedState.state, request.query.state)
    ) {
      response.status(400).json({ error: 'Google sign-in state is invalid.' })
      return
    }

    if (typeof request.query.error === 'string') {
      response.status(401).json({ error: 'Google sign-in was not completed.' })
      return
    }

    if (typeof request.query.code !== 'string' || !request.query.code) {
      response.status(400).json({ error: 'Google authorization code is required.' })
      return
    }

    try {
      const idToken = await exchangeGoogleCodeImplementation({
        code: request.query.code,
        codeVerifier: savedState.codeVerifier,
        config: googleOAuthConfig,
        fetchImplementation,
      })
      const identity = await verifyGoogleIdentityImplementation({
        idToken,
        nonce: savedState.nonce,
        clientId: googleOAuthConfig.clientId,
      })
      let user = await UserModel.findOne({
        googleSubject: identity.googleSubject,
      })

      if (!user) {
        try {
          user = await UserModel.createWithGoogleIdentity(identity)
        } catch (error) {
          if (error.code !== 11000) {
            throw error
          }

          user = await UserModel.findOne({
            googleSubject: identity.googleSubject,
          })

          if (!user) {
            throw error
          }
        }
      }

      await createAuthenticatedSession(user, response)
      response.redirect(googleOAuthConfig.successRedirectUrl)
    } catch (error) {
      console.error('Google sign-in failed:', error)
      response.status(502).json({ error: 'Google sign-in could not be completed.' })
    }
  })

  app.get('/api/auth/me', authenticate, (request, response) => {
    response.json({ data: request.authUser })
  })

  app.post('/api/auth/logout', async (request, response) => {
    const token = readAccessToken(request)
    const claims = token ? verifyAccessToken(token, jwtSecret) : null

    if (claims) {
      await SessionModel.findOneAndDelete({
        user: claims.userId,
        tokenHash: hashJwtId(claims.jwtId),
      })
    }

    clearAccessTokenCookie(response)
    response.status(204).end()
  })

  app.use('/api', authenticate)

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

  app.get('/api/shipments/:trackingNumber', async (request, response) => {
    const trackingNumber = request.params.trackingNumber.trim().toUpperCase()

    if (!/^[A-Z0-9-]{3,40}$/.test(trackingNumber)) {
      throw createHttpError(400, 'Invalid shipment tracking number.')
    }

    const shipment = await ShipmentModel.findOne({ trackingNumber })
      .populate('carrier', 'name code contactEmail')
      .lean()

    if (!shipment) {
      throw createHttpError(404, 'Shipment not found.')
    }

    response.json({ data: shipment })
  })

  app.post('/api/shipments/:trackingNumber/events', async (request, response) => {
    const trackingNumber = request.params.trackingNumber.trim().toUpperCase()
    const { stage, description, location, occurredAt } = request.body ?? {}

    if (!/^[A-Z0-9-]{3,40}$/.test(trackingNumber)) {
      throw createHttpError(400, 'Invalid shipment tracking number.')
    }

    if (
      !shipmentStages.includes(stage) ||
      !validString(description) ||
      (location !== undefined && typeof location !== 'string') ||
      !validString(occurredAt) ||
      Number.isNaN(Date.parse(occurredAt))
    ) {
      throw createHttpError(
        400,
        'A valid stage, description, and event date are required. Location must be a string.',
      )
    }

    const eventDate = new Date(occurredAt)
    const update = {
      $push: {
        trackingEvents: {
          stage,
          description: description.trim(),
          ...(location?.trim() ? { location: location.trim() } : {}),
          occurredAt: eventDate,
        },
      },
      $set: {
        currentStage: stage,
        ...(stage === 'delivered'
          ? { status: 'delivered', actualDelivery: eventDate }
          : {}),
      },
    }

    const shipment = await ShipmentModel.findOneAndUpdate(
      { trackingNumber },
      update,
      { returnDocument: 'after', runValidators: true },
    ).populate('carrier', 'name code contactEmail')

    if (!shipment) {
      throw createHttpError(404, 'Shipment not found.')
    }

    response.status(201).json({ data: shipment })
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

  const updateShipment = async (request, response) => {
    const trackingNumber = request.params.trackingNumber.trim().toUpperCase()
    const { customer, route, carrierId, estimatedDelivery } = request.body ?? {}

    if (!/^[A-Z0-9-]{3,40}$/.test(trackingNumber)) {
      throw createHttpError(400, 'Invalid shipment tracking number.')
    }

    if (
      !validString(customer) ||
      !route ||
      !validString(route.origin) ||
      !validString(route.destination) ||
      !validString(carrierId) ||
      !validString(estimatedDelivery)
    ) {
      throw createHttpError(
        400,
        'Customer, route, carrier, and estimated delivery are required.',
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

    const shipment = await ShipmentModel.findOneAndUpdate(
      { trackingNumber },
      {
        $set: {
          customer,
          route: {
            origin: route.origin,
            destination: route.destination,
          },
          carrier: carrier._id,
          estimatedDelivery,
        },
      },
      { returnDocument: 'after', runValidators: true },
    ).populate('carrier', 'name code')

    if (!shipment) {
      throw createHttpError(404, 'Shipment not found.')
    }

    response.json({ data: shipment })
  }

  app.put('/api/shipments/:trackingNumber', updateShipment)
  app.patch('/api/shipments/:trackingNumber', updateShipment)

  app.delete('/api/shipments/:trackingNumber', async (request, response) => {
    const trackingNumber = request.params.trackingNumber.trim().toUpperCase()

    if (!/^[A-Z0-9-]{3,40}$/.test(trackingNumber)) {
      throw createHttpError(400, 'Invalid shipment tracking number.')
    }

    const shipment = await ShipmentModel.findOneAndDelete({ trackingNumber })

    if (!shipment) {
      throw createHttpError(404, 'Shipment not found.')
    }

    response.status(204).end()
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
