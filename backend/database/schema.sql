-- Jambo Pharmacy PoS System Database Schema
-- Based on the provided Entity Relationship Diagram

-- =============================================
-- CORE USER MANAGEMENT
-- =============================================

-- User table (main user entity)
CREATE TABLE "User" (
    "UserID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "FirstName" VARCHAR(100) NOT NULL,
    "MiddleInitial" VARCHAR(1),
    "LastName" VARCHAR(100) NOT NULL,
    "Username" VARCHAR(50) UNIQUE NOT NULL,
    "Email" VARCHAR(255) UNIQUE NOT NULL,
    "Address" TEXT,
    "ContactNumber" VARCHAR(20),
    "DateTimeLastLoggedIn" TIMESTAMP,
    "CreatedAt" TIMESTAMP DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP DEFAULT NOW(),
    "Roles" VARCHAR(50) NOT NULL CHECK ("Roles" IN ('Admin','Pharmacist', 'Clerk')) DEFAULT 'Admin',
    "AuthUserID" UUID  NOT NULL,
    "IsActive" BOOLEAN DEFAULT true
);

-- Pharmacist table (inherits from User)
CREATE TABLE "Pharmacist" (
    "PharmacistID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserID" UUID REFERENCES "User"("UserID") NOT NULL,
    "LicenseNumber" VARCHAR(100),
    "Specialization" VARCHAR(100),
    "YearsOfExperience" INTEGER,
    "IsActive" BOOLEAN DEFAULT true,
    "CreatedAt" TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- PRODUCT MANAGEMENT
-- =============================================

-- Supplier table
CREATE TABLE "Supplier" (
    "SupplierID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Name" VARCHAR(255) NOT NULL,
    "ContactPerson" VARCHAR(100),
    "ContactNumber" VARCHAR(20),
    "Email" VARCHAR(255),
    "Address" TEXT,
    "Remarks" TEXT,
    "IsActiveYN" BOOLEAN DEFAULT true,
    "CreatedAt" TIMESTAMP DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP DEFAULT NOW()
);

-- Product table (main product entity)
CREATE TABLE "Product" (
    "ProductID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserID" UUID REFERENCES "User"("UserID") NOT NULL,
    "SupplierID" UUID REFERENCES "Supplier"("SupplierID") NOT NULL,
    "Name" VARCHAR(255) NOT NULL,
    "GenericName" VARCHAR(255),
    "Category" VARCHAR(100),
    "Brand" VARCHAR(100),
    "Image" TEXT,
    "SellingPrice" DECIMAL(10,2) NOT NULL,
    "IsVATExemptYN" BOOLEAN DEFAULT false,
    "VATAmount" DECIMAL(10,2) DEFAULT 0,
    "PrescriptionYN" BOOLEAN DEFAULT false,
    "DateTimeLastUpdate" TIMESTAMP DEFAULT NOW(),
    "IsActive" BOOLEAN DEFAULT true,
    "CreatedAt" TIMESTAMP DEFAULT NOW()
);

-- Product_Item table (inventory/stock tracking)
CREATE TABLE "Product_Item" (
    "ProductItemID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "ProductID" UUID REFERENCES "Product"("ProductID") NOT NULL,
    "UserID" UUID REFERENCES "User"("UserID") NOT NULL,
    "Stock" INTEGER NOT NULL DEFAULT 0,
    "ExpiryDate" DATE,
    "BatchNumber" VARCHAR(100),
    "Location" VARCHAR(100) DEFAULT 'main_store',
    "DateTimeLastUpdate" TIMESTAMP DEFAULT NOW(),
    "IsActive" BOOLEAN DEFAULT true,
    "CreatedAt" TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- DISCOUNT MANAGEMENT
-- =============================================

-- Discount table
CREATE TABLE "Discount" (
    "DiscountID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "Name" VARCHAR(100) NOT NULL,
    "DiscountPercent" DECIMAL(5,2) NOT NULL,
    "IsVATExemptYN" BOOLEAN DEFAULT false,
    "IsActive" BOOLEAN DEFAULT true,
    "ValidFrom" DATE,
    "ValidTo" DATE,
    "CreatedAt" TIMESTAMP DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- TRANSACTION MANAGEMENT
-- =============================================

-- Transaction table (sales transactions)
CREATE TABLE "Transaction" (
    "TransactionID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "UserID" UUID REFERENCES "User"("UserID") NOT NULL,
    "PharmacistID" UUID REFERENCES "Pharmacist"("PharmacistID"),
    "VATAmount" DECIMAL(10,2) DEFAULT 0,
    "Total" DECIMAL(10,2) NOT NULL,
    "OrderDateTime" TIMESTAMP DEFAULT NOW(),
    "PaymentMethod" VARCHAR(50) NOT NULL CHECK ("PaymentMethod" IN ('cash', 'card', 'insurance', 'mixed')),
    "CashReceived" DECIMAL(10,2),
    "PaymentChange" DECIMAL(10,2),
    "ReferenceNo" VARCHAR(100) UNIQUE,
    "Status" VARCHAR(50) DEFAULT 'completed' CHECK ("Status" IN ('pending', 'completed', 'cancelled', 'refunded')),
    "Notes" TEXT,
    "CreatedAt" TIMESTAMP DEFAULT NOW()
);

-- Transaction_Item table (items in each transaction)
CREATE TABLE "Transaction_Item" (
    "TransactionItemID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "TransactionID" UUID REFERENCES "Transaction"("TransactionID") NOT NULL,
    "ProductID" UUID REFERENCES "Product"("ProductID") NOT NULL,
    "DiscountID" UUID REFERENCES "Discount"("DiscountID"),
    "Quantity" INTEGER NOT NULL,
    "UnitPrice" DECIMAL(10,2) NOT NULL,
    "Subtotal" DECIMAL(10,2) NOT NULL,
    "CreatedAt" TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- PURCHASE ORDER MANAGEMENT
-- =============================================

-- Purchase_Order table (admin ordering from suppliers)
CREATE TABLE "Purchase_Order" (
    "PurchaseOrderID" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "SupplierID" UUID REFERENCES "Supplier"("SupplierID") NOT NULL,
    "ProductID" UUID REFERENCES "Product"("ProductID") NOT NULL,
    "OrderPlacedDateTime" TIMESTAMP DEFAULT NOW(),
    "ETA" TIMESTAMP,
    "OrderArrivalDateTime" TIMESTAMP,
    "BasePrice" DECIMAL(10,2) NOT NULL,
    "TotalPurchaseCost" DECIMAL(10,2) NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "Status" VARCHAR(50) DEFAULT 'pending' CHECK ("Status" IN ('pending', 'ordered', 'delivered', 'cancelled')),
    "Notes" TEXT,
    "CreatedAt" TIMESTAMP DEFAULT NOW(),
    "UpdatedAt" TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- User indexes
CREATE INDEX idx_user_username ON "User"("Username");
CREATE INDEX idx_user_email ON "User"("Email");
CREATE INDEX idx_user_pharmacist ON "User"("PharmacistYN");

-- Product indexes
CREATE INDEX idx_product_name ON "Product"("Name");
CREATE INDEX idx_product_category ON "Product"("Category");
CREATE INDEX idx_product_supplier ON "Product"("SupplierID");
CREATE INDEX idx_product_prescription ON "Product"("PrescriptionYN");

-- Product_Item indexes
CREATE INDEX idx_product_item_product ON "Product_Item"("ProductID");
CREATE INDEX idx_product_item_stock ON "Product_Item"("Stock");
CREATE INDEX idx_product_item_expiry ON "Product_Item"("ExpiryDate");

-- Transaction indexes
CREATE INDEX idx_transaction_user ON "Transaction"("UserID");
CREATE INDEX idx_transaction_pharmacist ON "Transaction"("PharmacistID");
CREATE INDEX idx_transaction_date ON "Transacti-on"("OrderDateTime");
CREATE INDEX idx_transaction_reference ON "Transaction"("ReferenceNo");

-- Transaction_Item indexes
CREATE INDEX idx_transaction_item_transaction ON "Transaction_Item"("TransactionID");
CREATE INDEX idx_transaction_item_product ON "Transaction_Item"("ProductID");

-- Purchase_Order indexes
CREATE INDEX idx_purchase_order_supplier ON "Purchase_Order"("SupplierID");
CREATE INDEX idx_purchase_order_product ON "Purchase_Order"("ProductID");
CREATE INDEX idx_purchase_order_date ON "Purchase_Order"("OrderPlacedDateTime");

-- =============================================
-- SAMPLE DATA
-- =============================================

-- Insert sample users
INSERT INTO "User" ("FirstName", "LastName", "Username", "Email", "Password", "ContactNumber", "PharmacistYN") VALUES
('John', 'Doe', 'johndoe', 'john@jambopharmacy.com', 'hashed_password_1', '+1-555-0101', false),
('Jane', 'Smith', 'janesmith', 'jane@jambopharmacy.com', 'hashed_password_2', '+1-555-0102', true),
('Mike', 'Johnson', 'mikejohnson', 'mike@jambopharmacy.com', 'hashed_password_3', '+1-555-0103', false);

-- Insert sample pharmacist
INSERT INTO "Pharmacist" ("UserID", "LicenseNumber", "Specialization", "YearsOfExperience") VALUES
((SELECT "UserID" FROM "User" WHERE "Username" = 'janesmith'), 'PH-12345', 'General Pharmacy', 5);

-- Insert sample suppliers
INSERT INTO "Supplier" ("Name", "ContactPerson", "ContactNumber", "Email", "Address") VALUES
('MedSupply Co.', 'John Smith', '+1-555-0201', 'john@medsupply.com', '123 Medical St, City'),
('PharmaDirect', 'Sarah Johnson', '+1-555-0202', 'sarah@pharmadirect.com', '456 Pharma Ave, City'),
('HealthPlus Distributors', 'Mike Brown', '+1-555-0203', 'mike@healthplus.com', '789 Health Blvd, City');

-- Insert sample products
INSERT INTO "Product" ("UserID", "SupplierID", "Name", "GenericName", "Category", "Brand", "SellingPrice", "IsVATExemptYN", "PrescriptionYN") VALUES
((SELECT "UserID" FROM "User" WHERE "Username" = 'johndoe'), (SELECT "SupplierID" FROM "Supplier" WHERE "Name" = 'MedSupply Co.'), 'Aspirin 100mg', 'Acetylsalicylic Acid', 'Pain Relief', 'Bayer', 5.99, false, false),
((SELECT "UserID" FROM "User" WHERE "Username" = 'johndoe'), (SELECT "SupplierID" FROM "Supplier" WHERE "Name" = 'MedSupply Co.'), 'Paracetamol 500mg', 'Acetaminophen', 'Pain Relief', 'Tylenol', 3.99, false, false),
((SELECT "UserID" FROM "User" WHERE "Username" = 'johndoe'), (SELECT "SupplierID" FROM "Supplier" WHERE "Name" = 'PharmaDirect'), 'Amoxicillin 500mg', 'Amoxicillin', 'Antibiotic', 'Generic', 15.99, false, true);

-- Insert sample product items (inventory)
INSERT INTO "Product_Item" ("ProductID", "UserID", "Stock", "ExpiryDate", "BatchNumber") VALUES
((SELECT "ProductID" FROM "Product" WHERE "Name" = 'Aspirin 100mg'), (SELECT "UserID" FROM "User" WHERE "Username" = 'johndoe'), 100, '2025-12-31', 'ASP-2024-001'),
((SELECT "ProductID" FROM "Product" WHERE "Name" = 'Paracetamol 500mg'), (SELECT "UserID" FROM "User" WHERE "Username" = 'johndoe'), 150, '2025-11-30', 'PAR-2024-001'),
((SELECT "ProductID" FROM "Product" WHERE "Name" = 'Amoxicillin 500mg'), (SELECT "UserID" FROM "User" WHERE "Username" = 'johndoe'), 50, '2025-10-31', 'AMX-2024-001');

-- Insert sample discounts
INSERT INTO "Discount" ("Name", "DiscountPercent", "IsVATExemptYN") VALUES
('Senior Citizen Discount', 10.00, false),
('VIP Customer Discount', 15.00, false),
('Bulk Purchase Discount', 5.00, false);

-- Insert sample purchase orders
INSERT INTO "Purchase_Order" ("SupplierID", "ProductID", "BasePrice", "TotalPurchaseCost", "Quantity", "ETA") VALUES
((SELECT "SupplierID" FROM "Supplier" WHERE "Name" = 'MedSupply Co.'), (SELECT "ProductID" FROM "Product" WHERE "Name" = 'Aspirin 100mg'), 3.50, 350.00, 100, NOW() + INTERVAL '7 days'),
((SELECT "SupplierID" FROM "Supplier" WHERE "Name" = 'PharmaDirect'), (SELECT "ProductID" FROM "Product" WHERE "Name" = 'Amoxicillin 500mg'), 12.00, 600.00, 50, NOW() + INTERVAL '5 days');

-- =============================================
-- USEFUL QUERIES FOR PoS SYSTEM
-- =============================================

-- Get low stock products
-- SELECT p."Name", pi."Stock", pi."ExpiryDate"
-- FROM "Product" p
-- JOIN "Product_Item" pi ON p."ProductID" = pi."ProductID"
-- WHERE pi."Stock" < 20;

-- Get products expiring soon
-- SELECT p."Name", pi."ExpiryDate", pi."Stock"
-- FROM "Product" p
-- JOIN "Product_Item" pi ON p."ProductID" = pi."ProductID"
-- WHERE pi."ExpiryDate" <= NOW() + INTERVAL '30 days'
-- ORDER BY pi."ExpiryDate";

-- Get daily sales report
-- SELECT 
--     DATE(t."OrderDateTime") as sale_date,
--     COUNT(*) as total_transactions,
--     SUM(t."Total") as total_revenue
-- FROM "Transaction" t
-- WHERE t."OrderDateTime" >= CURRENT_DATE
-- GROUP BY DATE(t."OrderDateTime");

-- Get top selling products
-- SELECT 
--     p."Name",
--     SUM(ti."Quantity") as total_sold,
--     SUM(ti."Subtotal") as total_revenue
-- FROM "Product" p
-- JOIN "Transaction_Item" ti ON p."ProductID" = ti."ProductID"
-- JOIN "Transaction" t ON ti."TransactionID" = t."TransactionID"
-- GROUP BY p."ProductID", p."Name"
-- ORDER BY total_sold DESC
-- LIMIT 10;
