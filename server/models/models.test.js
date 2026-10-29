import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import mongoose from 'mongoose'
import { Carrier, Shipment } from './index.js'

async function validationErrors(document) {
  try {
    await document.validate()
  } catch (error) {
    assert.ok(error instanceof mongoose.Error.ValidationError)
    return error.errors
  }

  return {}
}

describe('Carrier schema', () => {
  it('normalizes carrier identifiers and applies operational defaults', async () => {
    const carrier = new Carrier({
      name: '  Northstar Freight  ',
      code: 'nsf',
      contactEmail: 'OPS@NORTHSTAR.EXAMPLE',
      serviceTypes: ['ground', 'rail'],
    })

    assert.equal(carrier.name, 'Northstar Freight')
    assert.equal(carrier.code, 'NSF')
    assert.equal(carrier.contactEmail, 'ops@northstar.example')
    assert.equal(carrier.isActive, true)
    assert.equal(carrier.onTimeRate, 0)
    assert.equal(carrier.rating, 0)
    assert.deepEqual(carrier.serviceRegions, [])
    await assert.doesNotReject(carrier.validate())
  })

  it('rejects invalid carrier metrics and service types', async () => {
    const carrier = new Carrier({
      name: 'Northstar Freight',
      code: 'NSF',
      onTimeRate: 101,
      rating: 6,
      serviceTypes: ['teleport'],
    })

    const errors = await validationErrors(carrier)

    assert.ok(errors.onTimeRate)
    assert.ok(errors.rating)
    assert.ok(errors['serviceTypes.0'])
  })
})

describe('Shipment schema', () => {
  const validShipment = () => ({
    trackingNumber: 'shp-10482',
    customer: 'Northstar Retail',
    route: {
      origin: 'Rotterdam',
      destination: 'Lyon',
    },
    carrier: new mongoose.Types.ObjectId(),
    estimatedDelivery: new Date('2026-10-30T12:00:00Z'),
  })

  it('normalizes tracking numbers and applies shipment defaults', async () => {
    const shipment = new Shipment(validShipment())

    assert.equal(shipment.trackingNumber, 'SHP-10482')
    assert.equal(shipment.status, 'on_track')
    assert.equal(shipment.currentStage, 'origin_handling')
    assert.equal(shipment.delayHours, 0)
    assert.deepEqual(shipment.trackingEvents, [])
    await assert.doesNotReject(shipment.validate())
  })

  it('requires a customer, route, carrier, and estimated delivery', async () => {
    const shipment = new Shipment({ trackingNumber: 'SHP-1' })
    const errors = await validationErrors(shipment)

    assert.ok(errors.customer)
    assert.ok(errors.route)
    assert.ok(errors.carrier)
    assert.ok(errors.estimatedDelivery)
  })

  it('rejects invalid status, negative delay, and incomplete tracking events', async () => {
    const shipment = new Shipment({
      ...validShipment(),
      status: 'in_transit',
      delayHours: -1,
      trackingEvents: [{ stage: 'customs' }],
    })
    const errors = await validationErrors(shipment)

    assert.ok(errors.status)
    assert.ok(errors.delayHours)
    assert.ok(errors['trackingEvents.0.description'])
    assert.ok(errors['trackingEvents.0.occurredAt'])
  })

  it('references the Carrier model and declares lookup indexes', () => {
    assert.equal(Shipment.schema.path('carrier').options.ref, 'Carrier')

    const indexes = Shipment.schema.indexes().map(([fields]) => fields)

    assert.ok(indexes.some((fields) => fields.status === 1 && fields.estimatedDelivery === 1))
    assert.ok(indexes.some((fields) => fields.carrier === 1 && fields.estimatedDelivery === 1))
  })

  it('declares unique tracking and carrier identifiers', () => {
    assert.equal(Shipment.schema.path('trackingNumber').options.unique, true)
    assert.equal(Carrier.schema.path('code').options.unique, true)
  })
})
