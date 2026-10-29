import 'dotenv/config'
import mongoose from 'mongoose'
import { connectToDatabase } from './db/connect.js'
import { Carrier, Shipment } from './models/index.js'

const carrierRecords = [
  {
    name: 'DHL Freight',
    code: 'DHLF',
    contactEmail: 'freight@example.com',
    serviceRegions: ['Europe'],
    serviceTypes: ['ground', 'rail'],
    onTimeRate: 91,
    rating: 4.4,
  },
  {
    name: 'DB Schenker',
    code: 'DBSK',
    contactEmail: 'operations@example.com',
    serviceRegions: ['Europe'],
    serviceTypes: ['ground', 'rail', 'air'],
    onTimeRate: 93,
    rating: 4.5,
  },
  {
    name: 'Maersk',
    code: 'MAEU',
    contactEmail: 'cargo@example.com',
    serviceRegions: ['Europe', 'Asia'],
    serviceTypes: ['ocean', 'ground'],
    onTimeRate: 89,
    rating: 4.2,
  },
  {
    name: 'Kuehne+Nagel',
    code: 'KNG',
    contactEmail: 'support@example.com',
    serviceRegions: ['Europe', 'North America'],
    serviceTypes: ['air', 'ground', 'ocean'],
    onTimeRate: 95,
    rating: 4.7,
  },
]

const shipmentRecords = [
  {
    trackingNumber: 'SHP-10482',
    customer: 'Northstar Retail',
    route: { origin: 'Rotterdam', destination: 'Lyon' },
    carrierCode: 'DHLF',
    status: 'at_risk',
    currentStage: 'customs',
    delayHours: 18,
  },
  {
    trackingNumber: 'SHP-10477',
    customer: 'Cedar & Co.',
    route: { origin: 'Hamburg', destination: 'Prague' },
    carrierCode: 'DBSK',
    status: 'delayed',
    currentStage: 'linehaul',
    delayHours: 9,
  },
  {
    trackingNumber: 'SHP-10471',
    customer: 'Morrow Foods',
    route: { origin: 'Antwerp', destination: 'Milan' },
    carrierCode: 'MAEU',
    status: 'at_risk',
    currentStage: 'last_mile',
    delayHours: 6,
  },
  {
    trackingNumber: 'SHP-10466',
    customer: 'Atlas Medical',
    route: { origin: 'Le Havre', destination: 'Berlin' },
    carrierCode: 'KNG',
    status: 'on_track',
    currentStage: 'linehaul',
    delayHours: 0,
  },
  {
    trackingNumber: 'SHP-10459',
    customer: 'Lumen Hardware',
    route: { origin: 'Rotterdam', destination: 'Warsaw' },
    carrierCode: 'DHLF',
    status: 'delayed',
    currentStage: 'customs',
    delayHours: 31,
  },
]

async function seedDatabase() {
  await connectToDatabase()

  try {
    const carriers = new Map()

    for (const carrierRecord of carrierRecords) {
      const carrier = await Carrier.findOneAndUpdate(
        { code: carrierRecord.code },
        { $set: carrierRecord },
        { returnDocument: 'after', upsert: true, runValidators: true },
      )
      carriers.set(carrierRecord.code, carrier._id)
    }

    for (const shipmentRecord of shipmentRecords) {
      const { carrierCode, ...fields } = shipmentRecord

      await Shipment.findOneAndUpdate(
        { trackingNumber: fields.trackingNumber },
        {
          $set: {
            ...fields,
            carrier: carriers.get(carrierCode),
            estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        },
        { returnDocument: 'after', upsert: true, runValidators: true },
      )
    }

    console.info(
      `Seeded ${carrierRecords.length} carriers and ${shipmentRecords.length} shipments.`,
    )
  } finally {
    await mongoose.disconnect()
  }
}

seedDatabase().catch((error) => {
  console.error('Could not seed the database:', error.message)
  process.exitCode = 1
})
