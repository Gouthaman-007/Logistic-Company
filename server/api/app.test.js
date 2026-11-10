import assert from 'node:assert/strict'
import { before, describe, it } from 'node:test'
import mongoose from 'mongoose'
import request from 'supertest'
import { createApp } from './app.js'

const carrierId = new mongoose.Types.ObjectId()
const carrier = { _id: carrierId, name: 'DHL Freight', code: 'DHLF' }
const testUser = {
  _id: new mongoose.Types.ObjectId(),
  username: 'api-test',
  verifyPassword: async (password) => password === 'correct-horse-battery',
}
let app
let agent
let createdPayload
let shipmentQuery
let shipmentLookup
let shipmentUpdate
let shipmentEditUpdate
let shipmentDeletion
let carrierQuery
const sessions = new Map()

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

before(async () => {
  app = createApp({
    getDatabaseState: () => 1,
    UserModel: {
      async createWithPassword(username) {
        return { ...testUser, username }
      },
      findOne(filter) {
        return {
          select: async () =>
            filter.username === testUser.username ? testUser : null,
        }
      },
    },
    SessionModel: {
      async create(session) {
        sessions.set(session.tokenHash, { ...session, user: testUser })
        return session
      },
      findOne(filter) {
        return {
          populate: async () => {
            const session = sessions.get(filter.tokenHash)
            return session && session.expiresAt > new Date() ? session : null
          },
        }
      },
      async findOneAndDelete(filter) {
        const session = sessions.get(filter.tokenHash)
        sessions.delete(filter.tokenHash)
        return session ?? null
      },
    },
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
      findOneAndUpdate(filter, update, options) {
        if (update.$push) {
          shipmentUpdate = { filter, update, options }
        } else {
          shipmentEditUpdate = { filter, update, options }
        }
        return {
          populate: async () => {
            if (filter.trackingNumber === 'SHP-99999') {
              return null
            }

            return {
              trackingNumber: filter.trackingNumber,
              customer: update.$set.customer ?? 'Northstar Retail',
              route: update.$set.route ?? {
                origin: 'Rotterdam',
                destination: 'Lyon',
              },
              currentStage: update.$set.currentStage,
              status: update.$set.status ?? 'at_risk',
              trackingEvents: update.$push?.trackingEvents
                ? [update.$push.trackingEvents]
                : [],
              carrier,
            }
          },
        }
      },
      async findOneAndDelete(filter) {
        shipmentDeletion = { filter }
        return filter.trackingNumber === 'SHP-99999'
          ? null
          : { trackingNumber: filter.trackingNumber }
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
  agent = request.agent(app)
  const registration = await agent
    .post('/api/auth/register')
    .send({ username: 'api-test', password: 'correct-horse-battery' })
  assert.equal(registration.status, 201)
})

describe('Database-backed shipment API', () => {
  it('requires authentication and exposes the signed-in user', async () => {
    const anonymousResponse = await request(app).get('/api/shipments')
    assert.equal(anonymousResponse.status, 401)

    const response = await agent.get('/api/auth/me')
    assert.equal(response.status, 200)
    assert.deepEqual(response.body.data, {
      id: testUser._id.toString(),
      username: 'api-test',
    })
  })

  it('rejects invalid credentials without creating a session', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'api-test', password: 'wrong-password' })

    assert.equal(response.status, 401)
    assert.deepEqual(response.body, { error: 'Invalid username or password.' })
    assert.equal(response.headers['set-cookie'], undefined)
  })

  it('reports database connection status', async () => {
    const response = await agent.get('/api/health')

    assert.equal(response.status, 200)
    assert.deepEqual(response.body, {
      status: 'ok',
      database: 'connected',
    })
  })

  it('reads active carriers from the carrier model', async () => {
    const response = await agent.get('/api/carriers')

    assert.equal(response.status, 200)
    assert.deepEqual(carrierQuery.filter, { isActive: true })
    assert.equal(response.body.data[0].name, 'DHL Freight')
  })

  it('reads shipments, populates carriers, and filters search safely', async () => {
    const response = await agent.get('/api/shipments').query({
      search: 'Northstar (Retail)',
      status: 'at_risk',
    })

    assert.equal(response.status, 200)
    assert.equal(shipmentQuery.filter.status, 'at_risk')
    assert.equal(shipmentQuery.filter.$or[1].customer.source, 'Northstar \\(Retail\\)')
    assert.equal(response.body.data[0].trackingNumber, 'SHP-10482')
  })

  it('rejects invalid shipment status filters', async () => {
    const response = await agent
      .get('/api/shipments')
      .query({ status: 'unknown' })

    assert.equal(response.status, 400)
    assert.match(response.body.error, /Invalid shipment status/)
  })

  it('reads one shipment by normalized tracking number', async () => {
    const response = await agent.get('/api/shipments/shp-10482')

    assert.equal(response.status, 200)
    assert.deepEqual(shipmentLookup.filter, { trackingNumber: 'SHP-10482' })
    assert.equal(response.body.data.customer, 'Northstar Retail')
    assert.equal(response.body.data.carrier.contactEmail, 'freight@example.com')
  })

  it('rejects invalid and unknown shipment tracking numbers', async () => {
    const invalidResponse = await agent.get('/api/shipments/%3Cscript%3E')
    assert.equal(invalidResponse.status, 400)

    const missingResponse = await agent.get('/api/shipments/SHP-99999')

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
    const response = await agent.post('/api/shipments').send(input)

    assert.equal(response.status, 201)
    assert.equal(createdPayload.trackingNumber, input.trackingNumber)
    assert.equal(createdPayload.carrier, carrierId)
    assert.deepEqual(createdPayload.route, input.route)
    assert.equal(response.body.data.carrier.name, 'DHL Freight')
  })

  it('rejects malformed shipment payloads before database writes', async () => {
    const response = await agent
      .post('/api/shipments')
      .send({ trackingNumber: 'SHP-10502' })

    assert.equal(response.status, 400)
    assert.match(response.body.error, /are required/)
    assert.equal(createdPayload.trackingNumber, 'SHP-10501')
  })

  it('updates shipment details using an active carrier', async () => {
    const input = {
      customer: 'Northstar Wholesale',
      route: { origin: 'Rotterdam', destination: 'Paris' },
      carrierId: carrierId.toString(),
      estimatedDelivery: '2026-10-31T12:00:00.000Z',
    }
    const response = await agent
      .put('/api/shipments/shp-10482')
      .send(input)

    assert.equal(response.status, 200)
    assert.deepEqual(shipmentEditUpdate.filter, {
      trackingNumber: 'SHP-10482',
    })
    assert.deepEqual(shipmentEditUpdate.update.$set, {
      customer: input.customer,
      route: input.route,
      carrier: carrierId,
      estimatedDelivery: input.estimatedDelivery,
    })
    assert.deepEqual(shipmentEditUpdate.options, {
      returnDocument: 'after',
      runValidators: true,
    })
    assert.equal(response.body.data.customer, input.customer)
  })

  it('keeps PATCH available as a backward-compatible update method', async () => {
    const response = await agent
      .patch('/api/shipments/shp-10482')
      .send({
        customer: 'Northstar Wholesale',
        route: { origin: 'Rotterdam', destination: 'Paris' },
        carrierId: carrierId.toString(),
        estimatedDelivery: '2026-10-31T12:00:00.000Z',
      })

    assert.equal(response.status, 200)
    assert.equal(response.body.data.customer, 'Northstar Wholesale')
  })

  it('rejects invalid and unknown shipment updates', async () => {
    const invalidResponse = await agent
      .put('/api/shipments/%3Cscript%3E')
      .send({})
    assert.equal(invalidResponse.status, 400)

    const missingResponse = await agent
      .put('/api/shipments/SHP-99999')
      .send({
        customer: 'Northstar',
        route: { origin: 'Rotterdam', destination: 'Paris' },
        carrierId: carrierId.toString(),
        estimatedDelivery: '2026-10-31T12:00:00.000Z',
      })
    assert.equal(missingResponse.status, 404)
  })

  it('deletes an existing shipment and returns not found for a missing one', async () => {
    const response = await agent.delete('/api/shipments/shp-10482')

    assert.equal(response.status, 204)
    assert.deepEqual(shipmentDeletion.filter, {
      trackingNumber: 'SHP-10482',
    })

    const missingResponse = await agent.delete('/api/shipments/SHP-99999')
    assert.equal(missingResponse.status, 404)
  })

  it('appends a tracking event and advances the current shipment stage', async () => {
    const input = {
      stage: 'customs',
      description: 'Customs documents approved',
      location: 'Lyon',
      occurredAt: '2026-10-30T12:00:00.000Z',
    }
    const response = await agent
      .post('/api/shipments/shp-10482/events')
      .send(input)

    assert.equal(response.status, 201)
    assert.deepEqual(shipmentUpdate.filter, { trackingNumber: 'SHP-10482' })
    assert.equal(shipmentUpdate.update.$push.trackingEvents.stage, 'customs')
    assert.equal(shipmentUpdate.update.$set.currentStage, 'customs')
    assert.deepEqual(shipmentUpdate.options, {
      returnDocument: 'after',
      runValidators: true,
    })
    assert.equal(response.body.data.trackingEvents[0].location, 'Lyon')
  })

  it('rejects invalid tracking event payloads', async () => {
    const response = await agent
      .post('/api/shipments/SHP-10482/events')
      .send({ stage: 'teleport', description: '', occurredAt: 'not-a-date' })

    assert.equal(response.status, 400)
    assert.match(response.body.error, /valid stage/)
  })
})
