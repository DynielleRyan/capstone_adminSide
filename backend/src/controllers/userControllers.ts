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

// Sign in user
export const signIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { usernameOrEmail, password } = req.body;

    // Validate input
    if (!usernameOrEmail || !password) {
      res.status(400).json({
        success: false,
        message: 'Username/Email and password are required'
      });
      return;
    }

    // Check if input is email or username by looking for @ symbol
    const isEmail = usernameOrEmail.includes('@');
    
    // Find user in database
    let query = supabase
      .from('User')
      .select('*')
      .limit(1);

    if (isEmail) {
      query = query.eq('Email', usernameOrEmail);
    } else {
      query = query.eq('Username', usernameOrEmail);
    }

    const { data: users, error: userError } = await query;

    if (userError || !users || users.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    const user = users[0];

    // Authenticate with Supabase Auth using the email to check credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: user.Email,
      password: password
    });

    if (authError) {
      console.error('Authentication error:', authError);
      res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
      return;
    }

    if (!authData.user || !authData.session) {
      res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
      return;
    }

    // Check if email is verified
    const emailVerified = authData.user.email_confirmed_at !== null;

    // COMMENTED OUT FOR TESTING - Email verification check disabled
    // // Block ALL logins if email is NOT verified (no exceptions)
    // if (!emailVerified) {
    //   // Sign out the user since we won't allow this login
    //   await supabase.auth.signOut();
    //   
    //   res.status(403).json({
    //     success: false,
    //     message: 'Please verify your email before logging in. Check your inbox for the verification link.',
    //     requiresEmailVerification: true
    //   });
    //   return;
    // }

    // Allow both Admin and Pharmacist users to access the system
    // Block Clerk users from accessing this portal
    if (user.Roles !== 'Admin' && user.Roles !== 'Pharmacist') {
      // Sign out the user since we won't allow this login
      await supabase.auth.signOut();
      
      res.status(403).json({
        success: false,
        message: 'Access denied. This portal is for administrators and pharmacists only.'
      });
      return;
    }

    // Update last login time
    const { error: updateError } = await supabase
      .from('User')
      .update({ DateTimeLastLoggedIn: new Date() })
      .eq('UserID', user.UserID);

    if (updateError) {
      console.error('Error updating last login time:', updateError);
      // Don't fail the login if this fails, just log it
    }

    // Format user response
    const userResponse = formatUserResponse(user);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_in: authData.session.expires_in,
          expires_at: authData.session.expires_at
        },
        emailVerified: emailVerified
      }
    });
  } catch (error) {
    console.error('Error in signIn:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Sign out user
export const signOut = async (req: Request, res: Response): Promise<void> => {
  try {
    // Sign out from Supabase Auth
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error signing out:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sign out',
        error: error.message
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Signed out successfully'
    });
  } catch (error) {
    console.error('Error in signOut:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No authorization token provided'
      });
      return;
    }

    const token = authHeader.substring(7);

    // Get user from Supabase Auth token
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    // Get user from database using AuthUserID
    const { data: user, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('AuthUserID', authUser.id)
      .single();

    if (userError || !user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
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
    console.error('Error in getCurrentUser:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
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

    // Send invitation email first (this creates the user in Supabase Auth)
    // Prevent Admin role creation - default to Pharmacist if no role specified
    const userRole = userData.Roles || 'Pharmacist';
    
    // Block Admin role creation
    if (userRole === 'Admin') {
      res.status(400).json({
        success: false,
        message: 'Admin role cannot be created through this interface'
      });
      return;
    }
    
    console.log('Creating user with role:', userRole, 'from userData.Roles:', userData.Roles);
    
    // MODIFIED FOR TESTING - Email auto-confirmed for testing purposes
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.Email,
      password: userData.Password,
      email_confirm: true,  // FOR TESTING: Auto-confirm email so users can login immediately
      user_metadata: {
        first_name: userData.FirstName,
        last_name: userData.LastName,
        middle_initial: userData.MiddleInitial,
        username: userData.Username,
        contact_number: userData.ContactNumber,
        address: userData.Address,
        role: userRole
      }
    });

    if (authError) {
      console.error('Error creating user:', authError);
      res.status(500).json({
        success: false,
        message: 'Failed to create user',
        error: authError.message
      });
      return;
    }

    if (!authData.user) {
      res.status(500).json({
        success: false,
        message: 'Failed to create user - no user data returned'
      });
      return;
    }

    // FOR TESTING: Verification email disabled - users can login immediately
    console.log(`User created with auto-confirmed email: ${userData.Email}`);

    // Create user in our User table with the auth user ID
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
      // If creating the user record fails, clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      res.status(500).json({
        success: false,
        message: 'Failed to create user record',
        error: error.message
      });
      return;
    }

    console.log(`User created successfully: ${userData.Email}. Email auto-verified for testing.`);

    // Format user response
    const userResponse = formatUserResponse(newUser);

    res.status(201).json({
      success: true,
      message: 'User created successfully. You can now login immediately.',
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

// Create a new admin user (special endpoint for creating admin users)
export const createAdminUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userData: CreateUser = req.body;

    // Force the role to be Admin
    userData.Roles = 'Admin';

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

    console.log('Creating admin user with email:', userData.Email);
    
    // Create the admin user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userData.Email,
      password: userData.Password,
      email_confirm: true, // Auto-confirm email for admin users
      user_metadata: {
        first_name: userData.FirstName,
        last_name: userData.LastName,
        middle_initial: userData.MiddleInitial,
        username: userData.Username,
        contact_number: userData.ContactNumber,
        address: userData.Address,
        role: 'Admin'
      }
    });

    if (authError) {
      console.error('Error creating admin auth user:', authError);
      res.status(500).json({
        success: false,
        message: 'Failed to create admin authentication user',
        error: authError.message
      });
      return;
    }

    if (!authData.user) {
      res.status(500).json({
        success: false,
        message: 'Failed to create admin user - no user data returned'
      });
      return;
    }

    // Create user in our User table with the auth user ID
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
        Roles: 'Admin',
        AuthUserID: authData.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating admin user record:', error);
      // If creating the user record fails, clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      res.status(500).json({
        success: false,
        message: 'Failed to create admin user record',
        error: error.message
      });
      return;
    }

    console.log(`Admin user created successfully: ${userData.Email}`);

    // Format user response
    const userResponse = formatUserResponse(newUser);

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error in createAdminUser:', error);
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
      .select('*', { count: 'exact' })
      .neq('Roles', 'Admin'); // Exclude Admin users from results

    // Apply filters
    if (search) {
      query = query.or(`FirstName.ilike.%${search}%,LastName.ilike.%${search}%,Username.ilike.%${search}%,Email.ilike.%${search}%`);
    }

    // Support both old pharmacistYN filter and new role filter
    if (role !== undefined) {
      // Block Admin role filtering
      if (role === 'Admin') {
        res.status(400).json({
          success: false,
          message: 'Admin role cannot be filtered'
        });
        return;
      }
      query = query.eq('Roles', role);
    } else if (pharmacistYN !== undefined) {
      // Backwards compatibility: map pharmacistYN to role filter
      const targetRole = String(pharmacistYN) === 'true' ? 'Pharmacist' : 'Clerk';
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

    // Block Admin role updates
    if (updateData.Roles === 'Admin') {
      res.status(400).json({
        success: false,
        message: 'Admin role cannot be assigned through this interface'
      });
      return;
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

// Resend verification email
export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    // Get user by email first
    const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (getUserError) {
      res.status(500).json({
        success: false,
        message: 'Failed to find user',
        error: getUserError.message
      });
      return;
    }

    const user = users?.find(u => u.email === email);
    
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Generate magic link for email verification
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`
      }
    });

    if (error) {
      console.error('Failed to generate verification link:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email',
        error: error.message
      });
      return;
    }

    console.log(`Verification link generated for ${email}:`, data.properties.action_link);

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully',
      // Include the link in development for testing
      ...(process.env.NODE_ENV === 'development' && { verificationLink: data.properties.action_link })
    });
  } catch (error) {
    console.error('Error in resendVerificationEmail:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};
