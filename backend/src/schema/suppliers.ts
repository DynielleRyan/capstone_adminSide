// Supplier interface based on the SQL Supplier table
export interface Supplier {
  SupplierID?: string;
  Name: string;
  ContactPerson?: string;
  ContactNumber?: string;
  Email?: string;
  Address?: string;
  Remarks?: string;
  IsActiveYN?: boolean;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

// Interface for creating a new supplier (without auto-generated fields)
export interface CreateSupplier {
  Name: string;
  ContactPerson?: string;
  ContactNumber?: string;
  Email?: string;
  Address?: string;
  Remarks?: string;
  IsActiveYN?: boolean;
}

// Interface for updating a supplier (all fields optional except SupplierID)
export interface UpdateSupplier {
  SupplierID: string;
  Name?: string;
  ContactPerson?: string;
  ContactNumber?: string;
  Email?: string;
  Address?: string;
  Remarks?: string;
  IsActiveYN?: boolean;
  UpdatedAt?: Date;
}

// Supplier response type (same as Supplier for now, but can be extended)
export interface SupplierResponse {
  SupplierID?: string;
  Name: string;
  ContactPerson?: string;
  ContactNumber?: string;
  Email?: string;
  Address?: string;
  Remarks?: string;
  IsActiveYN?: boolean;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

// Pagination and filtering types
export interface SupplierFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedSuppliers {
  suppliers: SupplierResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
