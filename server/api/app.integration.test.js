import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import request from 'supertest'
import { createApp } from './app.js'
import { connectToDatabase } from '../db/connect.js'
import { Carrier, Shipment } from '../models/index.js'

let database
let app
let carrier

before(async () => {
  database = await MongoMemoryServer.create()
  await connectToDatabase(database.getUri())
  await Promise.all([Carrier.init(), Shipment.init()])
  carrier = await Carrier.create({
    name: 'DHL Freight',
    code: 'DHLF',
    serviceTypes: ['ground'],
  })
  app = createApp()
})

after(async () => {
  await mongoose.disconnect()
  await database?.stop()
})

describe('MongoDB shipment read and write flow', () => {
  it('reads carriers, creates a shipment, then reads it from MongoDB', async () => {
    const carriersResponse = await request(app).get('/api/carriers')
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
    const createResponse = await request(app)
      .post('/api/shipments')
      .send(shipmentInput)

    assert.equal(createResponse.status, 201)
    assert.equal(createResponse.body.data.carrier.name, 'DHL Freight')
    assert.equal(createResponse.body.data.status, 'on_track')

    const readResponse = await request(app)
      .get('/api/shipments')
      .query({ search: 'SHP-REAL-1' })

    assert.equal(readResponse.status, 200)
    assert.equal(readResponse.body.data.length, 1)
    assert.equal(readResponse.body.data[0].trackingNumber, 'SHP-REAL-1')
    assert.equal(readResponse.body.data[0].carrier.code, 'DHLF')

    const detailResponse = await request(app).get('/api/shipments/shp-real-1')

    assert.equal(detailResponse.status, 200)
    assert.equal(detailResponse.body.data.customer, 'Northstar Retail')
    assert.equal(detailResponse.body.data.carrier.name, 'DHL Freight')
    assert.ok(Array.isArray(detailResponse.body.data.trackingEvents))

    const invalidResponse = await request(app).get('/api/shipments/%3Cscript%3E')
    assert.equal(invalidResponse.status, 400)
  })

  it('rejects duplicate tracking numbers without overwriting the saved record', async () => {
    const response = await request(app)
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
    const response = await request(app).get('/api/shipments/SHP-UNKNOWN')

    assert.equal(response.status, 404)
    assert.deepEqual(response.body, { error: 'Shipment not found.' })
  })
})
