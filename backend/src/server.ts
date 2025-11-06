import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import dotenv from 'dotenv'

import authRoutes from './routes/authRoutes'
import userRoutes from './routes/userRoutes'
import supplierRoutes from './routes/supplierRoutes'
import productRoutes from './routes/productRoutes'
import productItemRoutes from './routes/productItemRoutes'
import transactionRoutes from './routes/transactionRoutes'
import purchaseOrderRoutes from './routes/purchaseOrderRoutes'
import reportRoutes from './routes/report.routes'
import dashboard from './routes/dashboard.routes'
import notifRoutes from './routes/notifications.routes'


// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Connect to database


// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}))
app.use(compression())
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/suppliers', supplierRoutes)
app.use('/api/products', productRoutes)
app.use('/api/product-items', productItemRoutes)
app.use("/api/transactions", transactionRoutes)
app.use("/api/purchase-orders", purchaseOrderRoutes)
app.use("/api/reports", reportRoutes)
app.use("/api/dashboard", dashboard)
app.use("/api/notifications", notifRoutes)

// Error handling middleware


// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📊 Health check: http://localhost:${PORT}/health`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app
