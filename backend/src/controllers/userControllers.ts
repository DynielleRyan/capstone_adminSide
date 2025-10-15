import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase, supabaseAdmin } from '../config/database';
import {
  User,
  CreateUser,
  UpdateUser,
  UpdateProfile,
  UserResponse,
  UserWithPharmacist,
  UserFilters,
  PaginatedUsers
} from '../schema/users';

// Helper function to hash password
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};


// Helper function to remove password from user object
const removePassword = (user: User): UserResponse => {
  const { Password, ...userResponse } = user;
  return userResponse;
};

// Create a new user
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: CreateUser = req.body;

    // Check if username or email already exists
    const { data: existingUsers } = await supabase
      .from('User')
      .select('UserID')
      .or(`Username.eq.${userData.Username},Email.eq.${userData.Email}`);

    if (existingUsers && existingUsers.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(userData.Password);

    // Create user
    const { data: newUser, error } = await supabase
      .from('User')
      .insert({
        FirstName: userData.FirstName,
        MiddleInitial: userData.MiddleInitial,
        LastName: userData.LastName,
        Username: userData.Username,
        Email: userData.Email,
        Address: userData.Address,
        Password: hashedPassword,
        ContactNumber: userData.ContactNumber,
        PharmacistYN: userData.PharmacistYN || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: error.message
      });
      return;
    }

    // Remove password from response
    const userResponse = removePassword(newUser);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error in createUser:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all users with pagination and filtering
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      isActive,
      pharmacistYN,
      page = 1,
      limit = 10
    }: UserFilters = req.query;

    let query = supabase
      .from('User')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`FirstName.ilike.%${search}%,LastName.ilike.%${search}%,Username.ilike.%${search}%,Email.ilike.%${search}%`);
    }

    if (isActive !== undefined) {
      query = query.eq('IsActive', String(isActive) === 'true');
    }

    if (pharmacistYN !== undefined) {
      query = query.eq('PharmacistYN', String(pharmacistYN) === 'true');
    }

    // Apply pagination
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;
    query = query.range(from, to);

    const { data: users, error, count } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
      return;
    }

    // Remove passwords from response
    const userResponses = users?.map(user => removePassword(user)) || [];

    const paginatedUsers: PaginatedUsers = {
      users: userResponses,
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((count || 0) / Number(limit))
    };

    res.status(200).json({
      success: true,
      data: paginatedUsers
    });
  } catch (error) {
    console.error('Error in getUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('User')
      .select('*')
      .eq('UserID', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }
      console.error('Error fetching user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user',
        error: error.message
      });
      return;
    }

    // Remove password from response
    const userResponse = removePassword(user);

    res.status(200).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Error in getUserById:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData: UpdateUser = req.body;

    // If password is being updated, hash it
    if (updateData.Password) {
      updateData.Password = await hashPassword(updateData.Password);
    }

    // Add updated timestamp
    updateData.UpdatedAt = new Date();

    const { data: updatedUser, error } = await supabase
      .from('User')
      .update(updateData)
      .eq('UserID', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }
      console.error('Error updating user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: error.message
      });
      return;
    }

    // Remove password from response
    const userResponse = removePassword(updatedUser);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error in updateUser:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Delete user (soft delete by setting IsActive to false)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('User')
      .update({ IsActive: false, UpdatedAt: new Date() })
      .eq('UserID', id);

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }
      console.error('Error deleting user:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: error.message
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteUser:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};


// Update user profile (excluding sensitive fields)
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const profileData: UpdateProfile = req.body;

    // Add updated timestamp
    const updateData = {
      ...profileData,
      UpdatedAt: new Date()
    };

    const { data: updatedUser, error } = await supabase
      .from('User')
      .update(updateData)
      .eq('UserID', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }
      console.error('Error updating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
      return;
    }

    // Remove password from response
    const userResponse = removePassword(updatedUser);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error in updateProfile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get user with pharmacist information
export const getUserWithPharmacist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabase
      .from('User')
      .select(`
        *,
        Pharmacist (
          PharmacistID,
          LicenseNumber,
          Specialization,
          YearsOfExperience,
          IsActive,
          CreatedAt
        )
      `)
      .eq('UserID', id)
      .eq('PharmacistYN', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({
          success: false,
          message: 'User not found or not a pharmacist'
        });
        return;
      }
      console.error('Error fetching user with pharmacist info:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user information',
        error: error.message
      });
      return;
    }

    // Remove password from response
    const userResponse = removePassword(user) as UserWithPharmacist;

    res.status(200).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Error in getUserWithPharmacist:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
