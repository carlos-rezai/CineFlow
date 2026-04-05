import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { connect } from './lib/db.js'
import discRouter from './routes/discs.js'
import tmdbRouter from './routes/tmdb.js'
import upcRouter from './routes/upc.js'
import statsRouter from './routes/stats.js'
import moodRouter from './routes/mood.js'
import decisionRouter from './routes/decision.js'

const app = express()

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173']

app.use(
  cors({
    origin: allowedOrigins,
  }),
)
app.use(express.json())

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many requests' },
})

app.use('/api/discs', discRouter)
app.use('/api/tmdb', tmdbRouter)
app.use('/api/upc', upcRouter)
app.use('/api/stats', statsRouter)
app.use('/api/mood', aiLimiter)
app.use('/api/mood', moodRouter)
app.use('/api/decision', aiLimiter)
app.use('/api/decision', decisionRouter)

const PORT = process.env.PORT ?? 3001
const MONGODB_URI = process.env.MONGODB_URI ?? ''

connect(MONGODB_URI).then(() => {
  app.listen(PORT)
})
