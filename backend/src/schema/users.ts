// User role type based on schema constraint
export type UserRole = 'Admin' | 'Pharmacist' | 'Clerk';

// User interface based on the SQL User table
export interface User {
  UserID?: string;
  FirstName: string;
  MiddleInitial?: string;
  LastName: string;
  Username: string;
  Email: string;
  Address?: string;
  ContactNumber?: string;
  DateTimeLastLoggedIn?: Date;
  Roles: UserRole;
  CreatedAt?: Date;
  UpdatedAt?: Date;
  AuthUserID?: string;
  IsActive?: boolean;
}

// Interface for creating a new user (without auto-generated fields)
export interface CreateUser {
  FirstName: string;
  MiddleInitial?: string;
  LastName: string;
  Username: string;
  Email: string;
  Password: string;
  Address?: string;
  ContactNumber?: string;
  Roles?: UserRole;
}

// Interface for updating a user (all fields optional except UserID)
export interface UpdateUser {
  UserID: string;
  FirstName?: string;
  MiddleInitial?: string;
  LastName?: string;
  Username?: string;
  Email?: string;
  Address?: string;
  ContactNumber?: string;
  DateTimeLastLoggedIn?: Date;
  Roles?: UserRole;
  IsActive?: boolean;
  UpdatedAt?: Date;
}

// Interface for user login
export interface LoginCredentials {
  Username: string;
  Password: string;
}

// Interface for sign in (username or email)
export interface SignInCredentials {
  usernameOrEmail: string;
  password: string;
}

// Interface for changing password
export interface ChangePassword {
  UserID: string;
  CurrentPassword: string;
  NewPassword: string;
}

// Interface for user profile update (excluding sensitive fields)
export interface UpdateProfile {
  UserID: string;
  FirstName?: string;
  MiddleInitial?: string;
  LastName?: string;
  Email?: string;
  Address?: string;
  ContactNumber?: string;
}

// User response type
export interface UserResponse {
  UserID?: string;
  FirstName: string;
  MiddleInitial?: string;
  LastName: string;
  Username: string;
  Email: string;
  Address?: string;
  ContactNumber?: string;
  DateTimeLastLoggedIn?: Date;
  Roles: UserRole;
  CreatedAt?: Date;
  UpdatedAt?: Date;
  AuthUserID?: string;
  IsActive?: boolean;
}

// User with pharmacist info
export interface UserWithPharmacist extends UserResponse {
  Pharmacist?: {
    PharmacistID: string;
    LicenseNumber?: string;
    Specialization?: string;
    YearsOfExperience?: number;
    IsActive: boolean;
    CreatedAt: Date;
  };
}

// Pagination and filtering types
export interface UserFilters {
  search?: string;
  pharmacistYN?: boolean; // Keep for backwards compatibility
  role?: UserRole; // New role-based filtering
  page?: number;
  limit?: number;
  sortBy?: string; // Sorting option: 'status', 'status-inactive', 'name', 'role'
}

export interface PaginatedUsers {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

