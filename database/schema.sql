-- ═══════════════════════════════════════════════════════════
-- Ali Market Database Schema
-- نظام إدارة المخزن والمبيعات
-- ═══════════════════════════════════════════════════════════

-- حذف الجداول القديمة إذا كانت موجودة
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;

-- ═══════════════════════════════════════════════════════════
-- جدول المستخدمين (Users)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- جدول المنتجات (Products)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  barcode TEXT UNIQUE,
  category TEXT,
  cost_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 10,
  unit TEXT DEFAULT 'قطعة',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- جدول العملاء (Customers)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  shop_name TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  area TEXT,
  total_debt DECIMAL(10, 2) DEFAULT 0,
  assigned_to UUID REFERENCES users(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- جدول الموردين (Suppliers)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  products_supplied TEXT,
  payment_terms TEXT,
  total_debt DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- جدول الفواتير (Invoices)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  remaining_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(10, 2) DEFAULT 0,
  payment_status TEXT CHECK (payment_status IN ('paid', 'partial', 'unpaid')) DEFAULT 'unpaid',
  notes TEXT,
  created_by UUID REFERENCES users(id),
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- جدول بنود الفواتير (Invoice Items)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  selling_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  profit DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- جدول التحصيلات (Payments)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT DEFAULT 'نقدي',
  notes TEXT,
  collected_by UUID REFERENCES users(id),
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- جدول المشتريات من الموردين (Purchases)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  cost_price DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  remaining_amount DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- جدول الإشعارات (Notifications)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT CHECK (type IN ('info', 'warning', 'error', 'success')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- Indexes للأداء
-- ═══════════════════════════════════════════════════════════
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_assigned_to ON customers(assigned_to);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_created_at ON payments(created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- Functions للحسابات التلقائية
-- ═══════════════════════════════════════════════════════════

-- دالة لتوليد رقم فاتورة تلقائي
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO counter FROM invoices;
  new_number := 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- دالة لتحديث ديون العميل
CREATE OR REPLACE FUNCTION update_customer_debt()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE customers
    SET total_debt = (
      SELECT COALESCE(SUM(remaining_amount), 0)
      FROM invoices
      WHERE customer_id = NEW.customer_id
    )
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة لخصم المنتجات من المخزن
CREATE OR REPLACE FUNCTION decrease_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET quantity = quantity - NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة لإضافة منتجات للمخزن عند الشراء
CREATE OR REPLACE FUNCTION increase_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET quantity = quantity + NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- Triggers
-- ═══════════════════════════════════════════════════════════

-- Trigger لتحديث ديون العميل تلقائياً
CREATE TRIGGER trigger_update_customer_debt
AFTER INSERT OR UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_customer_debt();

-- Trigger لخصم المخزون عند إنشاء فاتورة
CREATE TRIGGER trigger_decrease_stock
AFTER INSERT ON invoice_items
FOR EACH ROW
EXECUTE FUNCTION decrease_product_stock();

-- Trigger لزيادة المخزون عند الشراء
CREATE TRIGGER trigger_increase_stock
AFTER INSERT ON purchases
FOR EACH ROW
EXECUTE FUNCTION increase_product_stock();

-- Trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════

-- تفعيل RLS على كل الجداول
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- سياسات المستخدمين
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- سياسات المنتجات (الجميع يقرأ، المالك فقط يعدل)
CREATE POLICY "Everyone can view products" ON products FOR SELECT USING (true);
CREATE POLICY "Only owner can insert products" ON products FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Only owner can update products" ON products FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Only owner can delete products" ON products FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
);

-- سياسات العملاء
CREATE POLICY "Employees see assigned customers" ON customers FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
  OR assigned_to = auth.uid()
);
CREATE POLICY "Only owner can manage customers" ON customers FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
);

-- سياسات الموردين (المالك فقط)
CREATE POLICY "Only owner can view suppliers" ON suppliers FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Only owner can manage suppliers" ON suppliers FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
);

-- سياسات الفواتير
CREATE POLICY "Users see own invoices" ON invoices FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
  OR created_by = auth.uid()
);
CREATE POLICY "Users can create invoices" ON invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Only owner can update invoices" ON invoices FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
);

-- سياسات بنود الفواتير
CREATE POLICY "Users see own invoice items" ON invoice_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM invoices i 
    JOIN users u ON u.id = auth.uid()
    WHERE i.id = invoice_items.invoice_id 
    AND (u.role = 'owner' OR i.created_by = auth.uid())
  )
);
CREATE POLICY "Users can create invoice items" ON invoice_items FOR INSERT WITH CHECK (true);

-- سياسات التحصيلات
CREATE POLICY "Users see own payments" ON payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
  OR collected_by = auth.uid()
);
CREATE POLICY "Users can create payments" ON payments FOR INSERT WITH CHECK (true);

-- سياسات المشتريات (المالك فقط)
CREATE POLICY "Only owner can view purchases" ON purchases FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
);
CREATE POLICY "Only owner can manage purchases" ON purchases FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
);

-- سياسات الإشعارات
CREATE POLICY "Users see own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- بيانات تجريبية (Demo Data)
-- ═══════════════════════════════════════════════════════════

-- إنشاء مستخدم المالك التجريبي
-- ملحوظة: يجب إنشاء المستخدم من Authentication أولاً
-- البريد: owner@alimarket.com
-- كلمة المرور: 123456

-- بعد إنشاء المستخدم من Authentication، شغل هذا الكود:
-- INSERT INTO users (id, email, full_name, role)
-- VALUES ('USER_ID_FROM_AUTH', 'owner@alimarket.com', 'علي محمد', 'owner');

-- إضافة بيانات تجريبية للمنتجات
-- سيتم إضافتها بعد إنشاء المستخدم

-- ═══════════════════════════════════════════════════════════
-- انتهى إنشاء قاعدة البيانات
-- ═══════════════════════════════════════════════════════════
