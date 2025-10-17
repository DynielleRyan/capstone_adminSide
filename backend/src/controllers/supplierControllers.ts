import { Request, Response } from 'express';
import { supabase } from '../config/database';
import {
  Supplier,
  CreateSupplier,
  UpdateSupplier,
  SupplierResponse,
  SupplierFilters,
  PaginatedSuppliers
} from '../schema/suppliers';

// Helper function to return supplier response
const formatSupplierResponse = (supplier: Supplier): SupplierResponse => {
  return supplier as SupplierResponse;
};

// Create a new supplier
export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const supplierData: CreateSupplier = req.body;

    // Check if supplier name already exists
    const { data: existingSupplier } = await supabase
      .from('Supplier')
      .select('SupplierID')
      .eq('Name', supplierData.Name);

    if (existingSupplier && existingSupplier.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Supplier name already exists'
      });
      return;
    }

    // Create supplier in database
    const { data: newSupplier, error } = await supabase
      .from('Supplier')
      .insert({
        Name: supplierData.Name,
        ContactPerson: supplierData.ContactPerson,
        ContactNumber: supplierData.ContactNumber,
        Email: supplierData.Email,
        Address: supplierData.Address,
        Remarks: supplierData.Remarks,
        IsActiveYN: supplierData.IsActiveYN !== undefined ? supplierData.IsActiveYN : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating supplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create supplier',
        error: error.message
      });
      return;
    }

    // Format supplier response
    const supplierResponse = formatSupplierResponse(newSupplier);

    res.status(201).json({
      success: true,
      message: 'Supplier created successfully',
      data: supplierResponse
    });
  } catch (error) {
    console.error('Error in createSupplier:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all suppliers with pagination and filtering
export const getSuppliers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      isActive,
      page = 1,
      limit = 10
    }: SupplierFilters = req.query;

    let query = supabase
      .from('Supplier')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`Name.ilike.%${search}%,ContactPerson.ilike.%${search}%,Email.ilike.%${search}%`);
    }

    if (isActive !== undefined) {
      query = query.eq('IsActiveYN', isActive);
    }

    // Apply pagination
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;
    query = query.range(from, to);

    const { data: suppliers, error, count } = await query;

    if (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch suppliers',
        error: error.message
      });
      return;
    }

    // Format supplier responses
    const supplierResponses = suppliers?.map(supplier => formatSupplierResponse(supplier)) || [];

    const paginatedSuppliers: PaginatedSuppliers = {
      suppliers: supplierResponses,
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((count || 0) / Number(limit))
    };

    res.status(200).json({
      success: true,
      data: paginatedSuppliers
    });
  } catch (error) {
    console.error('Error in getSuppliers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get supplier by ID
export const getSupplierById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: supplier, error } = await supabase
      .from('Supplier')
      .select('*')
      .eq('SupplierID', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
        return;
      }
      console.error('Error fetching supplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch supplier',
        error: error.message
      });
      return;
    }

    // Format supplier response
    const supplierResponse = formatSupplierResponse(supplier);

    res.status(200).json({
      success: true,
      data: supplierResponse
    });
  } catch (error) {
    console.error('Error in getSupplierById:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update supplier
export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateSupplier = req.body;

    // Add updated timestamp
    updateData.UpdatedAt = new Date();

    const { data: updatedSupplier, error } = await supabase
      .from('Supplier')
      .update(updateData)
      .eq('SupplierID', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          message: 'Supplier not found'
        });
        return;
      }
      console.error('Error updating supplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update supplier',
        error: error.message
      });
      return;
    }

    // Format supplier response
    const supplierResponse = formatSupplierResponse(updatedSupplier);

    res.status(200).json({
      success: true,
      message: 'Supplier updated successfully',
      data: supplierResponse
    });
  } catch (error) {
    console.error('Error in updateSupplier:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete supplier (hard delete)
export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // First check if supplier exists
    const { data: existingSupplier, error: fetchError } = await supabase
      .from('Supplier')
      .select('SupplierID')
      .eq('SupplierID', id)
      .single();

    if (fetchError || !existingSupplier) {
      res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
      return;
    }

    // Check if supplier has associated products
    const { data: associatedProducts, error: productError } = await supabase
      .from('Product')
      .select('ProductID')
      .eq('SupplierID', id)
      .limit(1);

    if (productError) {
      console.error('Error checking associated products:', productError);
      res.status(500).json({
        success: false,
        message: 'Failed to check supplier dependencies',
        error: productError.message
      });
      return;
    }

    if (associatedProducts && associatedProducts.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Cannot delete supplier with associated products. Please reassign or delete products first.'
      });
      return;
    }

    // Delete supplier from database
    const { error } = await supabase
      .from('Supplier')
      .delete()
      .eq('SupplierID', id);

    if (error) {
      console.error('Error deleting supplier:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete supplier',
        error: error.message
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Supplier deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteSupplier:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
