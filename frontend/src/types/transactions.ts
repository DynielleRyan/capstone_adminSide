export interface Transaction {
    TransactionID: string;
    Total: number;
    PaymentMethod: string;
    VATAmount: string;
    OrderDateTime:string;
    CashReceived: string;
    PaymentChange: string;
    ReferenceNo: string;
    User: {
        FirstName: string;
        LastName: string;
      };
  }
  