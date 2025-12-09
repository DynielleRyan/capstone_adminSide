export interface Transaction {
    TransactionID: string;
    UserID: string;
    Total: number;
    PaymentMethod: string;
    VATAmount: number;
    OrderDateTime:string;
    CashReceived: string;
    PaymentChange: string;
    ReferenceNo: string;
    SeniorPWDID?: string | null;
    User: {
        FirstName: string;
        LastName: string;
      };
  }
  