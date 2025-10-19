// Purchase Order status type based on schema constraint
export type PurchaseOrderStatus = 'pending' | 'ordered' | 'delivered' | 'cancelled';

// Purchase Order interface based on the SQL Purchase_Order table
export interface PurchaseOrder {
  PurchaseOrderID?: string;
  SupplierID: string;
  ProductID: string;
  OrderPlacedDateTime?: Date;
  ETA?: Date;
  OrderArrivalDateTime?: Date;
  BasePrice: number;
  TotalPurchaseCost: number;
  Quantity: number;
  Status?: PurchaseOrderStatus;
  Notes?: string;
  CreatedAt?: Date;
  UpdatedAt?: Date;
}

