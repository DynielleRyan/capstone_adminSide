-- Pharmacy Admin Database Schema

-- Create database (run this separately)
-- CREATE DATABASE pharmacy_admin;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL,
    description TEXT,
    sku VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Insert default admin user (password: admin123)
INSERT INTO users (email, password, role) VALUES 
('admin@pharmacy.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample data
INSERT INTO customers (name, email, phone, address) VALUES 
('John Doe', 'john@example.com', '+1-555-0123', '123 Main St, City, State'),
('Jane Smith', 'jane@example.com', '+1-555-0124', '456 Oak Ave, City, State'),
('Bob Johnson', 'bob@example.com', '+1-555-0125', '789 Pine Rd, City, State')
ON CONFLICT (email) DO NOTHING;

INSERT INTO products (name, category, stock, price, description, sku) VALUES 
('Aspirin 100mg', 'Pain Relief', 100, 5.99, 'Pain relief medication', 'ASP-100'),
('Paracetamol 500mg', 'Pain Relief', 75, 3.99, 'Fever reducer and pain relief', 'PAR-500'),
('Vitamin C 1000mg', 'Supplements', 50, 12.99, 'Immune system support', 'VIT-C-1000'),
('Ibuprofen 400mg', 'Pain Relief', 60, 7.99, 'Anti-inflammatory pain relief', 'IBU-400'),
('Multivitamin', 'Supplements', 30, 15.99, 'Daily multivitamin supplement', 'MULTI-001')
ON CONFLICT (sku) DO NOTHING;
