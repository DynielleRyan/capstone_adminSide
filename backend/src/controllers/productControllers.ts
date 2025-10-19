import { Request, Response } from 'express';
import { supabase } from '../config/database';
import {
  Product,
  CreateProduct,
  UpdateProduct,
  ProductResponse,
  ProductFilters,
  PaginatedProducts,
  ProductSourceItem,
  PaginatedProductSource
} from '../schema/products';

// Helper function to format product response
const formatProductResponse = (product: Product): ProductResponse => {
  return product as ProductResponse;
};

// Get all products with optional filtering and pagination
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: ProductFilters = req.query;
    const page = parseInt(filters.page?.toString() || '1');
    const limit = parseInt(filters.limit?.toString() || '10');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('Product')
      .select(`
        *,
        Supplier:SupplierID(Name),
        User:UserID(FirstName, LastName)
      `);

    // Apply filters
    if (filters.search) {
      query = query.or(`Name.ilike.%${filters.search}%,GenericName.ilike.%${filters.search}%`);
    }
    if (filters.category) {
      query = query.eq('Category', filters.category);
    }
    if (filters.brand) {
      query = query.eq('Brand', filters.brand);
    }
    if (filters.supplier) {
      query = query.eq('SupplierID', filters.supplier);
    }
    if (filters.prescriptionOnly !== undefined) {
      query = query.eq('PrescriptionYN', filters.prescriptionOnly);
    }
    if (filters.isActive !== undefined) {
      query = query.eq('IsActive', filters.isActive);
    }
    if (filters.minPrice) {
      query = query.gte('SellingPrice', filters.minPrice);
    }
    if (filters.maxPrice) {
      query = query.lte('SellingPrice', filters.maxPrice);
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('Product')
      .select('*', { count: 'exact', head: true });

    // Apply same filters for count
    if (filters.search) {
      countQuery = countQuery.or(`Name.ilike.%${filters.search}%,GenericName.ilike.%${filters.search}%`);
    }
    if (filters.category) {
      countQuery = countQuery.eq('Category', filters.category);
    }
    if (filters.brand) {
      countQuery = countQuery.eq('Brand', filters.brand);
    }
    if (filters.supplier) {
      countQuery = countQuery.eq('SupplierID', filters.supplier);
    }
    if (filters.prescriptionOnly !== undefined) {
      countQuery = countQuery.eq('PrescriptionYN', filters.prescriptionOnly);
    }
    if (filters.isActive !== undefined) {
      countQuery = countQuery.eq('IsActive', filters.isActive);
    }
    if (filters.minPrice) {
      countQuery = countQuery.gte('SellingPrice', filters.minPrice);
    }
    if (filters.maxPrice) {
      countQuery = countQuery.lte('SellingPrice', filters.maxPrice);
    }

    const { count } = await countQuery;

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    const products: ProductResponse[] = data?.map(product => ({
      ...product,
      SupplierName: product.Supplier?.Name,
      UserName: product.User ? `${product.User.FirstName} ${product.User.LastName}` : undefined
    })) || [];

    const totalPages = Math.ceil((count || 0) / limit);

    const response: PaginatedProducts = {
      products,
      total: count || 0,
      page,
      limit,
      totalPages
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// Get product by ID
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('Product')
      .select(`
        *,
        Supplier:SupplierID(Name),
        User:UserID(FirstName, LastName)
      `)
      .eq('ProductID', id)
      .single();

    if (error) throw error;

    if (!data) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    const product: ProductResponse = {
      ...data,
      SupplierName: data.Supplier?.Name,
      UserName: data.User ? `${data.User.FirstName} ${data.User.LastName}` : undefined
    };

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// Create a new product
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const productData: CreateProduct = req.body;

    // Validate required fields
    if (!productData.Name || !productData.SellingPrice || !productData.UserID || !productData.SupplierID) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: Name, SellingPrice, UserID, SupplierID'
      });
      return;
    }

    // Check if supplier exists
    const { data: supplier } = await supabase
      .from('Supplier')
      .select('SupplierID')
      .eq('SupplierID', productData.SupplierID)
      .eq('IsActiveYN', true)
      .single();

    if (!supplier) {
      res.status(400).json({
        success: false,
        message: 'Invalid or inactive supplier'
      });
      return;
    }

    // Check if user exists
    const { data: user } = await supabase
      .from('User')
      .select('UserID')
      .eq('UserID', productData.UserID)
      .single();

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid user'
      });
      return;
    }

    const { data, error } = await supabase
      .from('Product')
      .insert([productData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: formatProductResponse(data)
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// Update a product
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateProduct = { ...req.body, ProductID: id };

    // Check if product exists
    const { data: existingProduct } = await supabase
      .from('Product')
      .select('ProductID')
      .eq('ProductID', id)
      .single();

    if (!existingProduct) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    // Validate supplier if provided
    if (updateData.SupplierID) {
      const { data: supplier } = await supabase
        .from('Supplier')
        .select('SupplierID')
        .eq('SupplierID', updateData.SupplierID)
        .eq('IsActiveYN', true)
        .single();

      if (!supplier) {
        res.status(400).json({
          success: false,
          message: 'Invalid or inactive supplier'
        });
        return;
      }
    }

    // Validate user if provided
    if (updateData.UserID) {
      const { data: user } = await supabase
        .from('User')
        .select('UserID')
        .eq('UserID', updateData.UserID)
        .single();

      if (!user) {
        res.status(400).json({
          success: false,
          message: 'Invalid user'
        });
        return;
      }
    }

    const { data, error } = await supabase
      .from('Product')
      .update(updateData)
      .eq('ProductID', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: formatProductResponse(data)
    });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// Delete a product (soft delete by setting IsActive to false)
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if product exists
    const { data: existingProduct } = await supabase
      .from('Product')
      .select('ProductID')
      .eq('ProductID', id)
      .single();

    if (!existingProduct) {
      res.status(404).json({
        success: false,
        message: 'Product not found'
      });
      return;
    }

    // Soft delete by setting IsActive to false
    const { data, error } = await supabase
      .from('Product')
      .update({ IsActive: false })
      .eq('ProductID', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Product deleted successfully',
      data: formatProductResponse(data)
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// Get product source list with supplier info and last purchase date
// Uses Supabase nested selects (implicit JOINs) to fetch all related data in a single query
export const getProductSourceList = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, page = '1', limit = '10', sortBy } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build query with nested selects - this performs JOINs under the hood
    let query = supabase
      .from('Product')
      .select(`
        ProductID,
        Name,
        Image,
        SupplierID,
        Supplier:SupplierID(
          Name,
          ContactNumber
        ),
        Product_Item(
          Stock,
          IsActive
        ),
        Purchase_Order(
          OrderPlacedDateTime
        )
      `)
      .eq('IsActive', true);

    // Apply search filter if provided
    if (search) {
      query = query.ilike('Name', `%${search}%`);
    }

    // Execute main query
    const { data: products, error } = await query;

    if (error) throw error;

    if (!products || products.length === 0) {
      res.json({
        products: [],
        total: 0,
        page: pageNum,
        limit: limitNum,
        totalPages: 0
      });
      return;
    }

    // Process and aggregate the joined data
    let productSourceList: ProductSourceItem[] = products
      .map(product => {
        const supplier = Array.isArray(product.Supplier) ? product.Supplier[0] : product.Supplier;
        
        // Aggregate stock from Product_Item (only active items)
        const productItems = Array.isArray(product.Product_Item) ? product.Product_Item : [];
        const totalStock = productItems
          .filter((item: any) => item.IsActive)
          .reduce((sum: number, item: any) => sum + (item.Stock || 0), 0);

        // Get last purchase date from Purchase_Order
        const purchaseOrders = Array.isArray(product.Purchase_Order) ? product.Purchase_Order : [];
        const lastPurchase = purchaseOrders.length > 0
          ? purchaseOrders.sort((a: any, b: any) => 
              new Date(b.OrderPlacedDateTime).getTime() - new Date(a.OrderPlacedDateTime).getTime()
            )[0]
          : null;

        return {
          ProductID: product.ProductID,
          ProductName: product.Name,
          ProductImage: product.Image,
          SupplierID: product.SupplierID,
          SupplierName: supplier?.Name || 'Unknown',
          ContactNumber: supplier?.ContactNumber,
          TotalStock: totalStock,
          LastPurchaseDate: lastPurchase?.OrderPlacedDateTime
        };
      })
      // Filter out products without a purchase history
      .filter(product => product.LastPurchaseDate !== undefined && product.LastPurchaseDate !== null);

    // Apply sorting
    if (sortBy) {
      const sortField = sortBy as string;
      productSourceList.sort((a, b) => {
        if (sortField === 'ProductName') {
          return a.ProductName.localeCompare(b.ProductName);
        } else if (sortField === 'SupplierName') {
          return a.SupplierName.localeCompare(b.SupplierName);
        } else if (sortField === 'LastPurchaseDate') {
          const dateA = a.LastPurchaseDate ? new Date(a.LastPurchaseDate).getTime() : 0;
          const dateB = b.LastPurchaseDate ? new Date(b.LastPurchaseDate).getTime() : 0;
          return dateB - dateA;
        }
        return 0;
      });
    }

    // Update total count to reflect only products with purchase dates
    const total = productSourceList.length;

    // Apply pagination
    const paginatedList = productSourceList.slice(offset, offset + limitNum);

    const response: PaginatedProductSource = {
      products: paginatedList,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching product source list:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};