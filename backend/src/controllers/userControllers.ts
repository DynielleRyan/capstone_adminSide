import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/database';
import {
  User,
  CreateUser,
  UpdateUser,
  UpdateProfile,
  UserResponse,
  UserWithPharmacist,
  UserFilters,
  PaginatedUsers,
  UserRole
} from '../schema/users';

// Helper function to return user response (no password to remove in this schema)
const formatUserResponse = (user: User): UserResponse => {
  return user as UserResponse;
};

// Create a new user
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: CreateUser = req.body;

    // Check if username or email already exists in our User table
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

    // Check if email already exists in Supabase Auth
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingAuthUser?.users?.some(user => user.email === userData.Email);
    
    if (emailExists) {
      res.status(400).json({
        success: false,
        message: 'Email already exists in authentication system'
      });
      return;
    }

    // Create user in Supabase Auth first
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.Email,
      password: userData.Password,
      user_metadata: {
        first_name: userData.FirstName,
        last_name: userData.LastName,
        middle_initial: userData.MiddleInitial,
        username: userData.Username,
        contact_number: userData.ContactNumber,
        address: userData.Address,
        role: userData.Roles || 'Admin'
      },
      email_confirm: true // Auto-confirm email since admin is creating the user
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      res.status(500).json({
        success: false,
        message: 'Failed to create authentication user',
        error: authError.message
      });
      return;
    }

    if (!authData.user) {
      res.status(500).json({
        success: false,
        message: 'Failed to create authentication user - no user data returned'
      });
      return;
    }

    // Create user in our User table with the auth user ID
    const userRole = userData.Roles || 'Admin';
    console.log('Creating user with role:', userRole, 'from userData.Roles:', userData.Roles);
    
    const { data: newUser, error } = await supabase
      .from('User')
      .insert({
        FirstName: userData.FirstName,
        MiddleInitial: userData.MiddleInitial,
        LastName: userData.LastName,
        Username: userData.Username,
        Email: userData.Email,
        Address: userData.Address,
        ContactNumber: userData.ContactNumber,
        Roles: userRole,
        AuthUserID: authData.user.id, // Store the Supabase Auth user ID in AuthUserID field
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating user record:', error);
      // If creating the user record fails, we should clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      res.status(500).json({
        success: false,
        message: 'Failed to create user record',
        error: error.message
      });
      return;
    }

    // Format user response
    const userResponse = formatUserResponse(newUser);

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
      pharmacistYN,
      role,
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

    // Support both old pharmacistYN filter and new role filter
    if (role !== undefined) {
      query = query.eq('Roles', role);
    } else if (pharmacistYN !== undefined) {
      // Backwards compatibility: map pharmacistYN to role filter
      const targetRole = String(pharmacistYN) === 'true' ? 'Pharmacist' : 'Admin';
      query = query.eq('Roles', targetRole);
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

    // Format user responses
    const userResponses = users?.map(user => formatUserResponse(user)) || [];

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

    // Format user response
    const userResponse = formatUserResponse(user);

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

    // Format user response
    const userResponse = formatUserResponse(updatedUser);

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

// Delete user (hard delete)
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // First check if user exists and get the AuthUserID
    const { data: existingUser, error: fetchError } = await supabase
      .from('User')
      .select('UserID, AuthUserID')
      .eq('UserID', id)
      .single();

    if (fetchError || !existingUser) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Delete user from our User table
    const { error } = await supabase
      .from('User')
      .delete()
      .eq('UserID', id);

    if (error) {
      console.error('Error deleting user from database:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user from database',
        error: error.message
      });
      return;
    }

    // Also delete the user from Supabase Auth using AuthUserID
    if (existingUser.AuthUserID) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(existingUser.AuthUserID);
      
      if (authError) {
        console.error('Error deleting user from auth:', authError);
        // Don't fail the request if auth deletion fails, but log it
        console.warn(`User ${id} deleted from database but not from auth: ${authError.message}`);
      }
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

    // Format user response
    const userResponse = formatUserResponse(updatedUser);

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
      .eq('Roles', 'Pharmacist')
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

    // Format user response
    const userResponse = formatUserResponse(user) as UserWithPharmacist;

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
