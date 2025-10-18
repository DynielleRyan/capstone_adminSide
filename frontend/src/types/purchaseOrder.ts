export interface PurchaseOrder {
    PurchaseOrderID: string;
    ProductID: string;
    SupplierID: string;
    Quantity: string;
    OrderPlacedDateTime: string;
    OrderArrivalDateTime: string | null;
    BasePrice: number;
    TotalPurchaseCost: number;
    ETA: string;
    Product: {
      Name: string;
    }
    Supplier: {
      Name: string;
    }
  }
  