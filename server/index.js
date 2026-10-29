import 'dotenv/config'
import mongoose from 'mongoose'
import { createApp } from './api/app.js'
import { connectToDatabase } from './db/connect.js'

const port = Number(process.env.PORT || 3001)

async function startServer() {
  await connectToDatabase()

  const server = createApp().listen(port, () => {
    console.info(`Haulwise API listening on port ${port}.`)
  })

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(async (error) => {
        if (error) {
          console.error('Failed to close the API server:', error)
          process.exitCode = 1
        }

        try {
          await mongoose.disconnect()
        } catch (disconnectError) {
          console.error('Failed to disconnect from MongoDB:', disconnectError)
          process.exitCode = 1
        }
      })
    })
  }
}

startServer().catch((error) => {
  console.error('Could not start the API server:', error.message)
  process.exitCode = 1
})
