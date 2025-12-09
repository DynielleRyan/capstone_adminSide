export interface Product {
    ProductID: string;
    Name: string;
    SupplierID: string;
    SellingPrice?: number;
    GenericName?: string;
    Category?: string;
    Brand?: string;
    Image?: string;
    IsVATExemptYN?: boolean;
    VATAmount?: number;
    PrescriptionYN?: boolean;
    SeniorPWDYN?: boolean;
    IsActive?: boolean;
    Supplier: {
        Name: string;
    }
  }