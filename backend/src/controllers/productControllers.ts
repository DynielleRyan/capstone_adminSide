import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
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

// Upload image to Supabase storage (base64 approach)
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageData, fileName } = req.body;

    if (!imageData || !fileName) {
      res.status(400).json({
        success: false,
        message: 'No image data or filename provided'
      });
      return;
    }

    // Extract base64 data and content type
    const matches = imageData.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      res.status(400).json({
        success: false,
        message: 'Invalid image data format'
      });
      return;
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate file size (max 5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      res.status(400).json({
        success: false,
        message: 'Image size exceeds 5MB limit'
      });
      return;
    }

    // Validate content type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(contentType)) {
      res.status(400).json({
        success: false,
        message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      });
      return;
    }

    // Generate unique file path
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExtension}`;
    const filePath = `products/${uniqueFileName}`;

    // Upload to Supabase storage
    const { error } = await supabaseAdmin.storage
      .from('product-images')
      .upload(filePath, buffer, {
        contentType: contentType,
        upsert: false
      });

    if (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload image to storage'
      });
      return;
    }

    // Get public URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(filePath);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        imageUrl: publicUrlData.publicUrl
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
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

    // Calculate VAT amount (12% if not VAT exempted)
    const isVATExempt = productData.IsVATExemptYN || false;
    const vatAmount = isVATExempt ? 0 : productData.SellingPrice * 0.12;
    productData.VATAmount = vatAmount;
    productData.IsVATExemptYN = isVATExempt;

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

    // Recalculate VAT amount if price or VAT status is being updated
    if (updateData.SellingPrice !== undefined || updateData.IsVATExemptYN !== undefined) {
      // Get current product data if we need it
      const { data: currentProduct } = await supabase
        .from('Product')
        .select('SellingPrice, IsVATExemptYN')
        .eq('ProductID', id)
        .single();

      const sellingPrice = updateData.SellingPrice ?? currentProduct?.SellingPrice ?? 0;
      const isVATExempt = updateData.IsVATExemptYN ?? currentProduct?.IsVATExemptYN ?? false;
      const vatAmount = isVATExempt ? 0 : sellingPrice * 0.12;
      
      updateData.VATAmount = vatAmount;
      updateData.IsVATExemptYN = isVATExempt;
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
    // First, get total count for pagination
    let countQuery = supabase
      .from('Product')
      .select('*', { count: 'exact', head: true })
      .eq('IsActive', true);

    if (search) {
      countQuery = countQuery.ilike('Name', `%${search}%`);
    }

    const { count, error: countError } = await countQuery;
    if (countError) throw countError;

    // Build main query with pagination
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

    // For complex sorting (SupplierName, LastPurchaseDate), we need to fetch more items,
    // process them, sort, then paginate. For ProductName, we can sort at DB level.
    const fetchLimit = (sortBy === 'SupplierName' || sortBy === 'LastPurchaseDate') 
      ? limitNum * 3  // Fetch 3x for complex sorting
      : limitNum;     // Normal fetch for simple sorting

    // Apply sorting at database level if possible (for better performance)
    if (sortBy === 'ProductName') {
      query = query.order('Name', { ascending: true });
    } else {
      // Default order for complex sorts (will be sorted after processing)
      query = query.order('ProductID', { ascending: true });
    }

    // Apply pagination - fetch more if complex sorting needed
    // For simple sorting, use offset. For complex sorting, fetch more and slice later
    if (sortBy === 'SupplierName' || sortBy === 'LastPurchaseDate') {
      // Fetch more items for complex sorting (will be sliced after processing)
      query = query.range(0, fetchLimit - 1);
    } else {
      // For simple sorting or no sort, use proper offset
      query = query.range(offset, offset + limitNum - 1);
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
          LastPurchaseDate: lastPurchase?.OrderPlacedDateTime || null
        };
      });

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

    // Total count from database query (already filtered)
    const total = count || 0;

    // Apply pagination after sorting (for complex sorts) or use already paginated data
    let paginatedList: ProductSourceItem[];
    if (sortBy === 'SupplierName' || sortBy === 'LastPurchaseDate') {
      // For complex sorting, slice after sorting
      paginatedList = productSourceList.slice(offset, offset + limitNum);
    } else {
      // For simple sorting or no sort, data is already paginated
      paginatedList = productSourceList;
    }

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