import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connect } from './lib/db.js'
import discRouter from './routes/discs.js'
import tmdbRouter from './routes/tmdb.js'
import upcRouter from './routes/upc.js'

const app = express()

app.use(
  cors({
    origin: 'http://localhost:5173',
  }),
)
app.use(express.json())

app.use('/api/discs', discRouter)
app.use('/api/tmdb', tmdbRouter)
app.use('/api/upc', upcRouter)

const PORT = process.env.PORT ?? 3001
const MONGODB_URI = process.env.MONGODB_URI ?? ''

connect(MONGODB_URI).then(() => {
  app.listen(PORT)
})
