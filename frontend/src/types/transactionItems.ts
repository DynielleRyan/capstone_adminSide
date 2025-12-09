export interface TransactionItem {
    TransactionItemID: string;
    TransactionID: string;
    DiscountID: string;
    Quantity: number;
    Subtotal: number;
    Product: {
        Name: string;
        Image?: string;
        Category?: string;
        Brand?: string;
        SellingPrice: number;
      };
    Discount?: {
        DiscountPercent: number;
        Name?: string;
    }
  }