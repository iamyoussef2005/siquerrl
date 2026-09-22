-- 1. جدول المستخدمين والمناديب (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'driver', -- admin, call_center, driver
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. جدول الزبائن (Customers)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    backup_phone TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- فهرس لتسريع البحث برقم هاتف الزبون
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- 3. جدول الطلبات (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGSERIAL PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    backup_phone TEXT,
    order_details TEXT NOT NULL,
    maps_url TEXT,
    collection_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    driver_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    office_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, assigned, delivering, delivered, cancelled
    created_at TIMESTAMPTZ DEFAULT now()
);

-- فهارس للطلبات
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON public.orders(driver_id);

-- 4. تفعيل Realtime للجداول
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- 5. تفعيل سياسات الأمان RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- دالة مساعدة لجلب دور المستخدم الحالي المسجل عبر Supabase Auth
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- سياسات جدول المستخدمين profiles:
-- السماح لجميع المستخدمين المسجلين بالقراءة (لمعرفة المناديب وهوية الحساب)
DROP POLICY IF EXISTS "Allow authenticated to read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated to read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- المدير يمتلك كامل الصلاحيات
DROP POLICY IF EXISTS "Allow admin full access on profiles" ON public.profiles;
CREATE POLICY "Allow admin full access on profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.get_current_role() = 'admin') WITH CHECK (public.get_current_role() = 'admin');

-- سياسات جدول الزبائن customers:
-- المدير والكول سنتر يقرأون وينشئون الزبائن
DROP POLICY IF EXISTS "Allow read customers" ON public.customers;
CREATE POLICY "Allow read customers" ON public.customers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff to insert/update customers" ON public.customers;
CREATE POLICY "Allow staff to insert/update customers" ON public.customers
  FOR ALL TO authenticated
  USING (public.get_current_role() IN ('admin', 'call_center'))
  WITH CHECK (public.get_current_role() IN ('admin', 'call_center'));

-- سياسات جدول الطلبات orders:
-- 1. المدير: صلاحية كاملة (قراءة، إضافة، إسناد، تعديل، حذف)
DROP POLICY IF EXISTS "Admin full access on orders" ON public.orders;
CREATE POLICY "Admin full access on orders" ON public.orders
  FOR ALL TO authenticated
  USING (public.get_current_role() = 'admin')
  WITH CHECK (public.get_current_role() = 'admin');

-- 2. الكول سنتر: قراءة طلبات اليوم وإنشاء طلبات جديدة
DROP POLICY IF EXISTS "Call Center select orders" ON public.orders;
CREATE POLICY "Call Center select orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.get_current_role() = 'call_center');

DROP POLICY IF EXISTS "Call Center insert orders" ON public.orders;
CREATE POLICY "Call Center insert orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (public.get_current_role() = 'call_center');

-- الكول سنتر: تعديل بيانات الطلب وتفاصيله وحساباته
DROP POLICY IF EXISTS "الكول سنتر يعدل بيانات الطلب" ON public.orders;
CREATE POLICY "الكول سنتر يعدل بيانات الطلب"
  ON public.orders
  FOR UPDATE TO authenticated
  USING (public.get_current_role() = 'call_center')
  WITH CHECK (public.get_current_role() = 'call_center');

-- دالة ومحفز لمنع الكول سنتر من تغيير حالة الطلب أو إسناد المندوب
CREATE OR REPLACE FUNCTION public.validate_call_center_order_update()
RETURNS trigger AS $$
BEGIN
  IF public.get_current_role() = 'call_center' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'غير مصرح لموظف الكول سنتر بتغيير حالة الطلب؛ الصلاحية محصورة بالمندوب وإدارة العمليات.';
    END IF;
    IF NEW.driver_id IS DISTINCT FROM OLD.driver_id THEN
      RAISE EXCEPTION 'غير مصرح لموظف الكول سنتر بإسناد أو تغيير المندوب؛ الصلاحية محصورة بإدارة العمليات.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_validate_call_center_update ON public.orders;
DROP TRIGGER IF EXISTS tr_a_validate_call_center_update ON public.orders;
CREATE TRIGGER tr_a_validate_call_center_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_call_center_order_update();

-- 3. المندوب: يقرأ فقط الطلبات المسندة إليه
DROP POLICY IF EXISTS "Driver view assigned orders" ON public.orders;
CREATE POLICY "Driver view assigned orders" ON public.orders
  FOR SELECT TO authenticated
  USING (
    public.get_current_role() = 'driver' AND driver_id = auth.uid()
  );

-- المندوب: يحدث حالة الطلب فقط للطلبات المسندة إليه
DROP POLICY IF EXISTS "Driver update assigned order status" ON public.orders;
CREATE POLICY "Driver update assigned order status" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    public.get_current_role() = 'driver' AND driver_id = auth.uid()
  )
  WITH CHECK (
    public.get_current_role() = 'driver' AND driver_id = auth.uid()
  );
-- 4. جدول عناوين الزبائن المتعددة (Customer Addresses)
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    maps_url TEXT,
    title TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_used_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_addresses_last_used ON public.customer_addresses(customer_id, last_used_at DESC);

-- سياسات أمان عناوين الزبائن
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to read customer addresses" ON public.customer_addresses;
CREATE POLICY "Allow authenticated to read customer addresses" ON public.customer_addresses
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow staff to insert customer addresses" ON public.customer_addresses;
CREATE POLICY "Allow staff to insert customer addresses" ON public.customer_addresses
  FOR INSERT TO authenticated
  WITH CHECK (public.get_current_role() IN ('admin', 'call_center'));

DROP POLICY IF EXISTS "Allow staff to update customer addresses" ON public.customer_addresses;
CREATE POLICY "Allow staff to update customer addresses" ON public.customer_addresses
  FOR UPDATE TO authenticated
  USING (public.get_my_role() IN ('admin', 'call_center'))
  WITH CHECK (public.get_my_role() IN ('admin', 'call_center'));

DROP POLICY IF EXISTS "Allow admin to delete customer addresses" ON public.customer_addresses;
CREATE POLICY "Allow admin to delete customer addresses" ON public.customer_addresses
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin');
