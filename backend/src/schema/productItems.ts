// Product_Item interface based on the SQL Product_Item table
export interface ProductItem {
  ProductItemID?: string;
  ProductID: string;
  UserID: string;
  Stock: number;
  ExpiryDate?: Date | string;
  BatchNumber?: string;
  Location?: string;
  DateTimeLastUpdate?: Date;
  IsActive?: boolean;
  CreatedAt?: Date;
}

// Interface for creating a new product item
export interface CreateProductItem {
  ProductID: string;
  UserID: string;
  Stock: number;
  ExpiryDate?: Date | string;
  BatchNumber?: string;
  Location?: string;
  IsActive?: boolean;
}

// Interface for updating a product item
export interface UpdateProductItem {
  ProductItemID: string;
  ProductID?: string;
  UserID?: string;
  Stock?: number;
  ExpiryDate?: Date | string;
  BatchNumber?: string;
  Location?: string;
  DateTimeLastUpdate?: Date;
  IsActive?: boolean;
}

// Product item response type
export interface ProductItemResponse {
  ProductItemID?: string;
  ProductID: string;
  UserID: string;
  Stock: number;
  ExpiryDate?: Date | string;
  BatchNumber?: string;
  Location?: string;
  DateTimeLastUpdate?: Date;
  IsActive?: boolean;
  CreatedAt?: Date;
  // Optional joined data
  ProductName?: string;
  UserName?: string;
}

// Pagination and filtering types
export interface ProductItemFilters {
  productId?: string;
  userId?: string;
  isActive?: boolean;
  expiryBefore?: Date | string;
  expiryAfter?: Date | string;
  minStock?: number;
  maxStock?: number;
  location?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedProductItems {
  productItems: ProductItemResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

