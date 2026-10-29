import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import mongoose from 'mongoose'
import request from 'supertest'
import { createApp } from './app.js'

const carrierId = new mongoose.Types.ObjectId()
const carrier = { _id: carrierId, name: 'DHL Freight', code: 'DHLF' }
let app
let createdPayload
let shipmentQuery
let shipmentLookup
let carrierQuery

function createQuery(result, selectedFields) {
  return {
    populate() {
      return this
    },
    select(fields) {
      selectedFields?.push(fields)
      return this
    },
    sort() {
      return this
    },
    limit() {
      return this
    },
    lean: async () => result,
  }
}

before(() => {
  app = createApp({
    getDatabaseState: () => 1,
    CarrierModel: {
      find(filter) {
        carrierQuery = { filter }
        return createQuery([carrier], carrierQuery.selectedFields ??= [])
      },
      findOne: async (filter) => (filter.isActive ? carrier : null),
    },
    ShipmentModel: {
      find(filter) {
        shipmentQuery = { filter }
        return createQuery([
          {
            trackingNumber: 'SHP-10482',
            customer: 'Northstar Retail',
            carrier,
          },
        ])
      },
      findOne(filter) {
        shipmentLookup = { filter }
        if (filter.trackingNumber === 'SHP-99999') {
          return createQuery(null)
        }

        return createQuery({
          trackingNumber: filter.trackingNumber,
          customer: 'Northstar Retail',
          route: { origin: 'Rotterdam', destination: 'Lyon' },
          carrier: { ...carrier, contactEmail: 'freight@example.com' },
          trackingEvents: [],
        })
      },
      async create(payload) {
        createdPayload = payload

        return {
          ...payload,
          _id: new mongoose.Types.ObjectId(),
          populate: async () => ({ ...payload, carrier }),
        }
      },
    },
  })
})

describe('Database-backed shipment API', () => {
  it('reports database connection status', async () => {
    const response = await request(app).get('/api/health')

    assert.equal(response.status, 200)
    assert.deepEqual(response.body, {
      status: 'ok',
      database: 'connected',
    })
  })

  it('reads active carriers from the carrier model', async () => {
    const response = await request(app).get('/api/carriers')

    assert.equal(response.status, 200)
    assert.deepEqual(carrierQuery.filter, { isActive: true })
    assert.equal(response.body.data[0].name, 'DHL Freight')
  })

  it('reads shipments, populates carriers, and filters search safely', async () => {
    const response = await request(app).get('/api/shipments').query({
      search: 'Northstar (Retail)',
      status: 'at_risk',
    })

    assert.equal(response.status, 200)
    assert.equal(shipmentQuery.filter.status, 'at_risk')
    assert.equal(shipmentQuery.filter.$or[1].customer.source, 'Northstar \\(Retail\\)')
    assert.equal(response.body.data[0].trackingNumber, 'SHP-10482')
  })

  it('rejects invalid shipment status filters', async () => {
    const response = await request(app)
      .get('/api/shipments')
      .query({ status: 'unknown' })

    assert.equal(response.status, 400)
    assert.match(response.body.error, /Invalid shipment status/)
  })

  it('reads one shipment by normalized tracking number', async () => {
    const response = await request(app).get('/api/shipments/shp-10482')

    assert.equal(response.status, 200)
    assert.deepEqual(shipmentLookup.filter, { trackingNumber: 'SHP-10482' })
    assert.equal(response.body.data.customer, 'Northstar Retail')
    assert.equal(response.body.data.carrier.contactEmail, 'freight@example.com')
  })

  it('rejects invalid and unknown shipment tracking numbers', async () => {
    const invalidResponse = await request(app).get('/api/shipments/%3Cscript%3E')
    assert.equal(invalidResponse.status, 400)

    const missingResponse = await request(app).get('/api/shipments/SHP-99999')

    assert.equal(missingResponse.status, 404)
    assert.match(missingResponse.body.error, /Shipment not found/)
  })

  it('writes a shipment linked to an active carrier', async () => {
    const input = {
      trackingNumber: 'SHP-10501',
      customer: 'Atlas Medical',
      route: { origin: 'Rotterdam', destination: 'Berlin' },
      carrierId: carrierId.toString(),
      estimatedDelivery: '2026-10-30T12:00:00.000Z',
    }
    const response = await request(app).post('/api/shipments').send(input)

    assert.equal(response.status, 201)
    assert.equal(createdPayload.trackingNumber, input.trackingNumber)
    assert.equal(createdPayload.carrier, carrierId)
    assert.deepEqual(createdPayload.route, input.route)
    assert.equal(response.body.data.carrier.name, 'DHL Freight')
  })

  it('rejects malformed shipment payloads before database writes', async () => {
    const response = await request(app)
      .post('/api/shipments')
      .send({ trackingNumber: 'SHP-10502' })

    assert.equal(response.status, 400)
    assert.match(response.body.error, /are required/)
    assert.equal(createdPayload.trackingNumber, 'SHP-10501')
  })
})
