// User interface based on the SQL User table
export interface User {
  UserID?: string;
  FirstName: string;
  MiddleInitial?: string;
  LastName: string;
  Username: string;
  Email: string;
  Address?: string;
  Password: string;
  ContactNumber?: string;
  DateTimeLastLoggedIn?: Date;
  PharmacistYN: boolean;
  IsActive: boolean;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

// Interface for creating a new user (without auto-generated fields)
export interface CreateUser {
  FirstName: string;
  MiddleInitial?: string;
  LastName: string;
  Username: string;
  Email: string;
  Address?: string;
  Password: string;
  ContactNumber?: string;
  PharmacistYN?: boolean;
  IsActive?: boolean;
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
  Password?: string;
  ContactNumber?: string;
  DateTimeLastLoggedIn?: Date;
  PharmacistYN?: boolean;
  IsActive?: boolean;
  UpdatedAt?: Date;
}

// Interface for user login
export interface LoginCredentials {
  Username: string;
  Password: string;
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

// User response type (excluding password)
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
  PharmacistYN: boolean;
  IsActive: boolean;
  CreatedAt?: Date;
  UpdatedAt?: Date;
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
  isActive?: boolean;
  pharmacistYN?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedUsers {
  users: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

