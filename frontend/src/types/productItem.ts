export interface ProductItem {
    ProductItemID: string;
    ProductID: string;
    Stock: number;
    ExpiryDate: string;
    IsActive: boolean;
    Product: {
        Name: string;
        GenericName: string;
        Category: string;
        Brand: string;
        Image: string;
        SellingPrice: number;
        IsVATExemptYN: string;
    }
  }