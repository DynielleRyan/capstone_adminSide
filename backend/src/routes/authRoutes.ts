import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import { supabase } from '../config/supabase'
import { auth } from '../middleware/auth'

const router = express.Router()

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    // Check if user exists
    const { data: user, error } = await supabase
      .from('User')
      .select('*')
      .eq('Email', email)
      .single()

    if (error || !user) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.Password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    // Create JWT
    const payload = {
      user: {
        id: user.UserID,
        email: user.Email,
        role: user.PharmacistYN ? 'pharmacist' : 'user'
      }
    }

    jwt.sign(
      payload,
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' },
      (err, token) => {
        if (err) throw err
        res.json({ token })
      }
    )
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req: any, res) => {
  try {
    const { data: user, error } = await supabase
      .from('User')
      .select('UserID, FirstName, LastName, Email, Username, PharmacistYN, CreatedAt')
      .eq('UserID', req.user.id)
      .single()

    if (error || !user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json(user)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
