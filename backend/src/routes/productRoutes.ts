import express from 'express'
import { body, validationResult } from 'express-validator'
import { supabase } from '../config/supabase'
import { auth } from '../middleware/auth'

const router = express.Router()

// @route   GET /api/products
// @desc    Get all products
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('Product')
      .select(`
        *,
        Product_Item!inner(Stock, ExpiryDate, BatchNumber),
        Supplier(Name, ContactPerson)
      `)
      .eq('IsActive', true)
      .order('CreatedAt', { ascending: false })

    if (error) {
      throw error
    }

    res.json(products)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { data: product, error } = await supabase
      .from('Product')
      .select(`
        *,
        Product_Item!inner(Stock, ExpiryDate, BatchNumber),
        Supplier(Name, ContactPerson)
      `)
      .eq('ProductID', req.params.id)
      .eq('IsActive', true)
      .single()

    if (error || !product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    res.json(product)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/products
// @desc    Create new product
// @access  Private
router.post('/', [
  auth,
  body('Name').notEmpty().trim(),
  body('Category').notEmpty().trim(),
  body('SellingPrice').isFloat({ min: 0 }),
  body('SupplierID').isUUID()
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const productData = {
      ...req.body,
      UserID: req.user.id,
      CreatedAt: new Date().toISOString()
    }

    const { data: product, error } = await supabase
      .from('Product')
      .insert(productData)
      .select()
      .single()

    if (error) {
      throw error
    }

    res.status(201).json(product)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private
router.put('/:id', [
  auth,
  body('Name').optional().notEmpty().trim(),
  body('Category').optional().notEmpty().trim(),
  body('SellingPrice').optional().isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const updateData = {
      ...req.body,
      DateTimeLastUpdate: new Date().toISOString()
    }

    const { data: product, error } = await supabase
      .from('Product')
      .update(updateData)
      .eq('ProductID', req.params.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    res.json(product)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   DELETE /api/products/:id
// @desc    Delete product (soft delete)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const { data: product, error } = await supabase
      .from('Product')
      .update({ IsActive: false })
      .eq('ProductID', req.params.id)
      .select()
      .single()

    if (error) {
      throw error
    }

    if (!product) {
      return res.status(404).json({ message: 'Product not found' })
    }

    res.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/products/search
// @desc    Search products
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' })
    }

    const { data: products, error } = await supabase
      .from('Product')
      .select(`
        *,
        Product_Item!inner(Stock, ExpiryDate, BatchNumber),
        Supplier(Name, ContactPerson)
      `)
      .or(`Name.ilike.%${q}%,Category.ilike.%${q}%,GenericName.ilike.%${q}%`)
      .eq('IsActive', true)
      .order('Name')

    if (error) {
      throw error
    }

    res.json(products)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router