import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import { createApp } from './app.js'
import { connectToDatabase } from '../db/connect.js'
import { Carrier, Session, Shipment, User } from '../models/index.js'

let database
let app
let agent
let carrier

before(async () => {
  database = await MongoMemoryServer.create()
  await connectToDatabase(database.getUri())
  await Promise.all([Carrier.init(), Session.init(), Shipment.init(), User.init()])
  carrier = await Carrier.create({
    name: 'DHL Freight',
    code: 'DHLF',
    serviceTypes: ['ground'],
  })
  app = createApp()
  agent = request.agent(app)
  const registration = await agent
    .post('/api/auth/register')
    .send({ username: 'integration-user', password: 'correct-horse-battery' })
  assert.equal(registration.status, 201)
})

after(async () => {
  await mongoose.disconnect()
  await database?.stop()
})

describe('MongoDB shipment read and write flow', () => {
  it('registers, authenticates, and revokes username/password sessions', async () => {
    const registrationAgent = request.agent(app)
    const registration = await registrationAgent
      .post('/api/auth/register')
      .send({ username: 'second-user', password: 'another-correct-password' })
    assert.equal(registration.status, 201)
    assert.equal(registration.body.data.username, 'second-user')
    assert.match(registration.headers['set-cookie'][0], /HttpOnly/)

    const storedUser = await User.findOne({ username: 'second-user' })
      .select('+passwordHash')
    assert.notEqual(storedUser.passwordHash, 'another-correct-password')
    assert.notEqual(
      storedUser.passwordHash,
      registration.headers['set-cookie'][0].match(/haulwise_session=([^;]+)/)[1],
    )

    const anonymousResponse = await request(app).get('/api/shipments')
    assert.equal(anonymousResponse.status, 401)

    const loginAgent = request.agent(app)
    const invalidLogin = await loginAgent
      .post('/api/auth/login')
      .send({ username: 'second-user', password: 'incorrect-password' })
    assert.equal(invalidLogin.status, 401)

    const login = await loginAgent
      .post('/api/auth/login')
      .send({ username: 'second-user', password: 'another-correct-password' })
    assert.equal(login.status, 200)

    const currentUser = await loginAgent.get('/api/auth/me')
    assert.equal(currentUser.status, 200)
    assert.equal(currentUser.body.data.username, 'second-user')

    const logout = await loginAgent.post('/api/auth/logout')
    assert.equal(logout.status, 204)
    const revokedSession = await loginAgent.get('/api/auth/me')
    assert.equal(revokedSession.status, 401)
  })

  it('rejects invalid registration data', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ username: 'x', password: 'short' })

    assert.equal(response.status, 400)
    assert.match(response.body.error, /Username must/)
  })

  it('reads carriers, creates a shipment, then reads it from MongoDB', async () => {
    const carriersResponse = await agent.get('/api/carriers')
    assert.equal(carriersResponse.status, 200)
    assert.equal(carriersResponse.body.data[0].code, 'DHLF')

    const shipmentInput = {
      trackingNumber: 'SHP-REAL-1',
      customer: 'Northstar Retail',
      route: {
        origin: 'Rotterdam',
        destination: 'Lyon',
      },
      carrierId: carrier._id.toString(),
      estimatedDelivery: '2026-10-30T12:00:00.000Z',
    }
    const createResponse = await agent
      .post('/api/shipments')
      .send(shipmentInput)

    assert.equal(createResponse.status, 201)
    assert.equal(createResponse.body.data.carrier.name, 'DHL Freight')
    assert.equal(createResponse.body.data.status, 'on_track')

    const carrierWithShipments = await Carrier.findById(carrier._id)
      .populate('shipments', 'trackingNumber customer')
    assert.ok(
      carrierWithShipments.shipments.some(
        (shipment) => shipment.trackingNumber === 'SHP-REAL-1',
      ),
    )

    const readResponse = await agent
      .get('/api/shipments')
      .query({ search: 'SHP-REAL-1' })

    assert.equal(readResponse.status, 200)
    assert.equal(readResponse.body.data.length, 1)
    assert.equal(readResponse.body.data[0].trackingNumber, 'SHP-REAL-1')
    assert.equal(readResponse.body.data[0].carrier.code, 'DHLF')

    const detailResponse = await agent.get('/api/shipments/shp-real-1')

    assert.equal(detailResponse.status, 200)
    assert.equal(detailResponse.body.data.customer, 'Northstar Retail')
    assert.equal(detailResponse.body.data.carrier.name, 'DHL Freight')
    assert.ok(Array.isArray(detailResponse.body.data.trackingEvents))

    const eventResponse = await agent
      .post('/api/shipments/SHP-REAL-1/events')
      .send({
        stage: 'delivered',
        description: 'Delivered to receiving desk',
        location: 'Lyon',
        occurredAt: '2026-10-30T12:00:00.000Z',
      })

    assert.equal(eventResponse.status, 201)
    assert.equal(eventResponse.body.data.status, 'delivered')
    assert.equal(eventResponse.body.data.currentStage, 'delivered')
    assert.equal(eventResponse.body.data.trackingEvents.length, 1)

    const updatedShipment = await Shipment.findOne({
      trackingNumber: 'SHP-REAL-1',
    }).lean()
    assert.equal(updatedShipment.status, 'delivered')
    assert.equal(updatedShipment.actualDelivery.toISOString(), '2026-10-30T12:00:00.000Z')

    const invalidResponse = await agent.get('/api/shipments/%3Cscript%3E')
    assert.equal(invalidResponse.status, 400)
  })

  it('updates and deletes a shipment in MongoDB', async () => {
    await Shipment.create({
      trackingNumber: 'SHP-CRUD-1',
      customer: 'Atlas Medical',
      route: { origin: 'Rotterdam', destination: 'Berlin' },
      carrier: carrier._id,
      estimatedDelivery: '2026-10-30T12:00:00.000Z',
    })

    const updateResponse = await agent
      .put('/api/shipments/SHP-CRUD-1')
      .send({
        customer: 'Atlas Health',
        route: { origin: 'Rotterdam', destination: 'Paris' },
        carrierId: carrier._id.toString(),
        estimatedDelivery: '2026-10-31T12:00:00.000Z',
      })
    assert.equal(updateResponse.status, 200)
    assert.equal(updateResponse.body.data.customer, 'Atlas Health')

    const savedShipment = await Shipment.findOne({
      trackingNumber: 'SHP-CRUD-1',
    }).lean()
    assert.equal(savedShipment.route.destination, 'Paris')

    const deleteResponse = await agent.delete('/api/shipments/SHP-CRUD-1')
    assert.equal(deleteResponse.status, 204)
    const deletedReadResponse = await agent
      .get('/api/shipments/SHP-CRUD-1')
    assert.equal(deletedReadResponse.status, 404)
  })

  it('rejects tracking events for unknown shipments', async () => {
    const response = await agent
      .post('/api/shipments/SHP-UNKNOWN/events')
      .send({
        stage: 'pickup',
        description: 'Collected',
        occurredAt: '2026-10-30T12:00:00.000Z',
      })

    assert.equal(response.status, 404)
  })

  it('rejects duplicate tracking numbers without overwriting the saved record', async () => {
    const response = await agent
      .post('/api/shipments')
      .send({
        trackingNumber: 'SHP-REAL-1',
        customer: 'Different customer',
        route: { origin: 'Hamburg', destination: 'Prague' },
        carrierId: carrier._id.toString(),
        estimatedDelivery: '2026-11-01T12:00:00.000Z',
      })

    assert.equal(response.status, 409)

    const savedShipment = await Shipment.findOne({
      trackingNumber: 'SHP-REAL-1',
    }).lean()
    assert.equal(savedShipment.customer, 'Northstar Retail')
  })

  it('returns not found when a tracking number is not in MongoDB', async () => {
    const response = await agent.get('/api/shipments/SHP-UNKNOWN')

    assert.equal(response.status, 404)
    assert.deepEqual(response.body, { error: 'Shipment not found.' })
  })
})
