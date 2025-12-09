// Product interface based on the SQL Product table
export interface Product {
  ProductID?: string;
  UserID: string;
  SupplierID: string;
  Name: string;
  GenericName?: string;
  Category?: string;
  Brand?: string;
  Image?: string;
  SellingPrice: number;
  IsVATExemptYN?: boolean;
  VATAmount?: number;
  PrescriptionYN?: boolean;
  SeniorPWDYN?: boolean;
  DateTimeLastUpdate?: Date;
  IsActive?: boolean;
  CreatedAt?: Date;
}

// Interface for creating a new product (without auto-generated fields)
export interface CreateProduct {
  UserID: string;
  SupplierID: string;
  Name: string;
  GenericName?: string;
  Category?: string;
  Brand?: string;
  Image?: string;
  SellingPrice: number;
  IsVATExemptYN?: boolean;
  VATAmount?: number;
  PrescriptionYN?: boolean;
  SeniorPWDYN?: boolean;
  IsActive?: boolean;
}

// Interface for updating a product (all fields optional except ProductID)
export interface UpdateProduct {
  ProductID: string;
  UserID?: string;
  SupplierID?: string;
  Name?: string;
  GenericName?: string;
  Category?: string;
  Brand?: string;
  Image?: string;
  SellingPrice?: number;
  IsVATExemptYN?: boolean;
  VATAmount?: number;
  PrescriptionYN?: boolean;
  SeniorPWDYN?: boolean;
  DateTimeLastUpdate?: Date;
  IsActive?: boolean;
}

// Product response type (can include joined data)
export interface ProductResponse {
  ProductID?: string;
  UserID: string;
  SupplierID: string;
  Name: string;
  GenericName?: string;
  Category?: string;
  Brand?: string;
  Image?: string;
  SellingPrice: number;
  IsVATExemptYN?: boolean;
  VATAmount?: number;
  PrescriptionYN?: boolean;
  SeniorPWDYN?: boolean;
  DateTimeLastUpdate?: Date;
  IsActive?: boolean;
  CreatedAt?: Date;
  // Optional joined data
  SupplierName?: string;
  UserName?: string;
}

// Pagination and filtering types
export interface ProductFilters {
  search?: string;
  category?: string;
  brand?: string;
  supplier?: string;
  prescriptionOnly?: boolean;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  products: ProductResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Product Source List response (joins Product, Product_Item, Purchase_Order, Supplier)
export interface ProductSourceItem {
  ProductID: string;
  ProductName: string;
  ProductImage?: string;
  SupplierID: string;
  SupplierName: string;
  ContactNumber?: string;
  TotalStock?: number;
  LastPurchaseDate?: string;
}

export interface PaginatedProductSource {
  products: ProductSourceItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}