export interface TransactionItem {
    TransactionItemID: string;
    TransactionID: string;
    Quantity: number;
    Subtotal: number;
    Product: {
        Name: string;
        Image: string;
        SellingPrice: number;
      };
  }