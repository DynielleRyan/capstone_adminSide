import { Request, Response } from 'express';
import { supabase } from '../config/database';
import {
  ProductItem,
  CreateProductItem,
  UpdateProductItem,
  ProductItemResponse,
  ProductItemFilters,
  PaginatedProductItems
} from '../schema/productItems';

// Helper function to format product item response
const formatProductItemResponse = (productItem: ProductItem): ProductItemResponse => {
  return productItem as ProductItemResponse;
};

// Get all product items with optional filtering and pagination
export const getAllProductItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: ProductItemFilters = req.query;
    const page = parseInt(filters.page?.toString() || '1');
    const limit = parseInt(filters.limit?.toString() || '10');
    const offset = (page - 1) * limit;

    let query = supabase
      .from('Product_Item')
      .select(`
        *,
        Product:ProductID(Name),
        User:UserID(FirstName, LastName)
      `);

    // Apply filters
    if (filters.productId) {
      query = query.eq('ProductID', filters.productId);
    }
    if (filters.userId) {
      query = query.eq('UserID', filters.userId);
    }
    if (filters.isActive !== undefined) {
      query = query.eq('IsActive', filters.isActive);
    }
    if (filters.expiryBefore) {
      query = query.lte('ExpiryDate', filters.expiryBefore);
    }
    if (filters.expiryAfter) {
      query = query.gte('ExpiryDate', filters.expiryAfter);
    }
    if (filters.minStock) {
      query = query.gte('Stock', filters.minStock);
    }
    if (filters.maxStock) {
      query = query.lte('Stock', filters.maxStock);
    }
    if (filters.location) {
      query = query.eq('Location', filters.location);
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('Product_Item')
      .select('*', { count: 'exact', head: true });

    // Apply same filters for count
    if (filters.productId) {
      countQuery = countQuery.eq('ProductID', filters.productId);
    }
    if (filters.userId) {
      countQuery = countQuery.eq('UserID', filters.userId);
    }
    if (filters.isActive !== undefined) {
      countQuery = countQuery.eq('IsActive', filters.isActive);
    }
    if (filters.expiryBefore) {
      countQuery = countQuery.lte('ExpiryDate', filters.expiryBefore);
    }
    if (filters.expiryAfter) {
      countQuery = countQuery.gte('ExpiryDate', filters.expiryAfter);
    }
    if (filters.minStock) {
      countQuery = countQuery.gte('Stock', filters.minStock);
    }
    if (filters.maxStock) {
      countQuery = countQuery.lte('Stock', filters.maxStock);
    }
    if (filters.location) {
      countQuery = countQuery.eq('Location', filters.location);
    }

    const { count } = await countQuery;

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) throw error;

    const productItems: ProductItemResponse[] = data?.map(item => ({
      ...item,
      ProductName: item.Product?.Name,
      UserName: item.User ? `${item.User.FirstName} ${item.User.LastName}` : undefined
    })) || [];

    const totalPages = Math.ceil((count || 0) / limit);

    const response: PaginatedProductItems = {
      productItems,
      total: count || 0,
      page,
      limit,
      totalPages
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching product items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// Get product item by ID
export const getProductItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('Product_Item')
      .select(`
        *,
        Product:ProductID(Name),
        User:UserID(FirstName, LastName)
      `)
      .eq('ProductItemID', id)
      .single();

    if (error) throw error;

    if (!data) {
      res.status(404).json({
        success: false,
        message: 'Product item not found'
      });
      return;
    }

    const productItem: ProductItemResponse = {
      ...data,
      ProductName: data.Product?.Name,
      UserName: data.User ? `${data.User.FirstName} ${data.User.LastName}` : undefined
    };

    res.json({
      success: true,
      data: productItem
    });
  } catch (error) {
    console.error('Error fetching product item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// Get product items by product ID (all inventory for a specific product)
export const getProductItemsByProductId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;

    const { data, error } = await supabase
      .from('Product_Item')
      .select(`
        *,
        Product:ProductID(Name),
        User:UserID(FirstName, LastName)
      `)
      .eq('ProductID', productId)
      .eq('IsActive', true)
      .order('ExpiryDate', { ascending: true });

    if (error) throw error;

    const productItems: ProductItemResponse[] = data?.map(item => ({
      ...item,
      ProductName: item.Product?.Name,
      UserName: item.User ? `${item.User.FirstName} ${item.User.LastName}` : undefined
    })) || [];

    res.json({
      success: true,
      data: productItems
    });
  } catch (error) {
    console.error('Error fetching product items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// Create a new product item
export const createProductItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const productItemData: CreateProductItem = req.body;

    // Validate required fields
    if (!productItemData.ProductID || !productItemData.UserID || productItemData.Stock === undefined) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: ProductID, UserID, Stock'
      });
      return;
    }

    // Check if product exists
    const { data: product } = await supabase
      .from('Product')
      .select('ProductID')
      .eq('ProductID', productItemData.ProductID)
      .eq('IsActive', true)
      .single();

    if (!product) {
      res.status(400).json({
        success: false,
        message: 'Invalid or inactive product'
      });
      return;
    }

    // Check if user exists
    const { data: user } = await supabase
      .from('User')
      .select('UserID')
      .eq('UserID', productItemData.UserID)
      .single();

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid user'
      });
      return;
    }

    // Set default location if not provided
    const itemData = {
      ...productItemData,
      Location: productItemData.Location || 'main_store',
      IsActive: productItemData.IsActive !== undefined ? productItemData.IsActive : true
    };

    const { data, error } = await supabase
      .from('Product_Item')
      .insert([itemData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Product item created successfully',
      data: formatProductItemResponse(data)
    });
  } catch (error) {
    console.error('Error creating product item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// Update a product item
export const updateProductItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateProductItem = { ...req.body, ProductItemID: id };

    // Check if product item exists
    const { data: existingItem } = await supabase
      .from('Product_Item')
      .select('ProductItemID')
      .eq('ProductItemID', id)
      .single();

    if (!existingItem) {
      res.status(404).json({
        success: false,
        message: 'Product item not found'
      });
      return;
    }

    // Validate product if provided
    if (updateData.ProductID) {
      const { data: product } = await supabase
        .from('Product')
        .select('ProductID')
        .eq('ProductID', updateData.ProductID)
        .eq('IsActive', true)
        .single();

      if (!product) {
        res.status(400).json({
          success: false,
          message: 'Invalid or inactive product'
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

    // Update DateTimeLastUpdate
    const dataToUpdate = {
      ...updateData,
      DateTimeLastUpdate: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('Product_Item')
      .update(dataToUpdate)
      .eq('ProductItemID', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Product item updated successfully',
      data: formatProductItemResponse(data)
    });
  } catch (error) {
    console.error('Error updating product item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// Delete a product item (soft delete by setting IsActive to false)
export const deleteProductItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if product item exists
    const { data: existingItem } = await supabase
      .from('Product_Item')
      .select('ProductItemID')
      .eq('ProductItemID', id)
      .single();

    if (!existingItem) {
      res.status(404).json({
        success: false,
        message: 'Product item not found'
      });
      return;
    }

    // Soft delete by setting IsActive to false
    const { data, error } = await supabase
      .from('Product_Item')
      .update({ 
        IsActive: false,
        DateTimeLastUpdate: new Date().toISOString()
      })
      .eq('ProductItemID', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Product item deleted successfully',
      data: formatProductItemResponse(data)
    });
  } catch (error) {
    console.error('Error deleting product item:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// Get low stock items (stock below a threshold, default 10)
export const getLowStockItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const threshold = parseInt(req.query.threshold?.toString() || '10');

    const { data, error } = await supabase
      .from('Product_Item')
      .select(`
        *,
        Product:ProductID(Name, Category, Brand),
        User:UserID(FirstName, LastName)
      `)
      .eq('IsActive', true)
      .lte('Stock', threshold)
      .order('Stock', { ascending: true });

    if (error) throw error;

    const productItems: ProductItemResponse[] = data?.map(item => ({
      ...item,
      ProductName: item.Product?.Name,
      UserName: item.User ? `${item.User.FirstName} ${item.User.LastName}` : undefined
    })) || [];

    res.json({
      success: true,
      data: productItems
    });
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

// Get expiring items (expiring within X days, default 30)
export const getExpiringItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days?.toString() || '30');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const { data, error } = await supabase
      .from('Product_Item')
      .select(`
        *,
        Product:ProductID(Name, Category, Brand),
        User:UserID(FirstName, LastName)
      `)
      .eq('IsActive', true)
      .not('ExpiryDate', 'is', null)
      .lte('ExpiryDate', futureDate.toISOString())
      .gte('ExpiryDate', new Date().toISOString())
      .order('ExpiryDate', { ascending: true });

    if (error) throw error;

    const productItems: ProductItemResponse[] = data?.map(item => ({
      ...item,
      ProductName: item.Product?.Name,
      UserName: item.User ? `${item.User.FirstName} ${item.User.LastName}` : undefined
    })) || [];

    res.json({
      success: true,
      data: productItems
    });
  } catch (error) {
    console.error('Error fetching expiring items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error'
    });
  }
};

