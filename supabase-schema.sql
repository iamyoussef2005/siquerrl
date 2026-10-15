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
    items_price NUMERIC(12, 2) NOT NULL DEFAULT 0, -- يحدده المندوب فقط (ثمن الأغراض المشتراة)
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0, -- يحدده المدير فقط (أجرة التوصيل)
    collection_amount NUMERIC(12, 2) NOT NULL DEFAULT 0, -- إجمالي المبلغ المطلوب تحصيله من الزبون = items_price + delivery_fee
    driver_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    office_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, assigned, delivering, delivered, cancelled
    created_at TIMESTAMPTZ DEFAULT now(),
    assigned_at TIMESTAMPTZ
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
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT role::text FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT public.get_my_role();
$$;

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

-- دالة ومحفز للتحقق من تعديلات الكول سنتر (يسمح بتعديل أجرة التوصيل وإسناد المندوب وتحديث الحالة إلى assigned/pending، ويمنع تعديل سعر الأغراض)
CREATE OR REPLACE FUNCTION public.validate_call_center_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_commission numeric;
BEGIN
  IF public.get_my_role() = 'call_center' THEN
    -- منع تعديل سعر الأغراض من الكول سنتر (محصور بالمندوب والإدارة)
    IF NEW.items_price IS DISTINCT FROM OLD.items_price THEN
      RAISE EXCEPTION 'غير مصرح لموظف الكول سنتر بتحديد أو تعديل سعر الأغراض؛ الصلاحية محصورة بالمندوب الميداني والإدارة.';
    END IF;

    -- إذا تم إسناد مندوب أو تغييره
    IF NEW.driver_id IS NOT NULL THEN
      -- إذا كان الطلب بانتظار الإسناد وأُسند لمندوب، يتم تحديث الحالة إلى 'assigned'
      IF OLD.status = 'pending' THEN
        NEW.status := 'assigned';
      END IF;
    ELSE
      -- إذا تم إلغاء إسناد المندوب وكان الطلب 'assigned'، يعود إلى 'pending'
      IF OLD.status = 'assigned' THEN
        NEW.status := 'pending';
      END IF;
    END IF;

    -- منع الكول سنتر من تغيير الحالة يدوياً لحالات غير مسموحة (مثل delivering, delivered, cancelled)
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('pending', 'assigned') THEN
      RAISE EXCEPTION 'غير مصرح لموظف الكول سنتر بتغيير حالة الطلب؛ الصلاحية محصورة بالمندوب وإدارة العمليات.';
    END IF;

    -- الكول سنتر يمكنه تعديل أجرة التوصيل. الحفاظ على سعر الأغراض وإعادة احتساب الإجمالي
    NEW.delivery_fee := COALESCE(NEW.delivery_fee, OLD.delivery_fee, 0);
    NEW.items_price := OLD.items_price;
    NEW.collection_amount := NEW.items_price + NEW.delivery_fee;

    -- حساب حصة السائق والمكتب إذا تم إسناد مندوب
    IF NEW.driver_id IS NOT NULL THEN
      SELECT commission_percentage INTO v_commission
      FROM public.profiles
      WHERE id = NEW.driver_id;

      v_commission := COALESCE(v_commission, 70);
      NEW.driver_fee := ROUND(NEW.delivery_fee * (v_commission / 100.0), 2);
      NEW.office_fee := NEW.delivery_fee - NEW.driver_fee;
      NEW.assigned_at := COALESCE(NEW.assigned_at, now());
    ELSE
      NEW.driver_fee := 0;
      NEW.office_fee := 0;
      NEW.assigned_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

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

-- المندوب: يحدث حالة الطلب وسعر الأغراض فقط للطلبات المسندة إليه
DROP POLICY IF EXISTS "Driver update assigned order status" ON public.orders;
CREATE POLICY "Driver update assigned order status" ON public.orders
  FOR UPDATE TO authenticated
  USING (
    public.get_current_role() = 'driver' AND driver_id = auth.uid()
  )
  WITH CHECK (
    public.get_current_role() = 'driver' AND driver_id = auth.uid()
  );

-- محفز للتحقق من تعديلات المندوب (يسمح فقط بتعديل status و items_price ويعيد احتساب collection_amount)
CREATE OR REPLACE FUNCTION public.validate_driver_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  diff jsonb;
BEGIN
  IF public.get_current_role() = 'driver' THEN
    diff := (to_jsonb(NEW) - array['status', 'items_price', 'collection_amount', 'updated_at'])
            - (to_jsonb(OLD) - array['status', 'items_price', 'collection_amount', 'updated_at']);

    IF diff <> '{}'::jsonb THEN
      RAISE EXCEPTION 'غير مصرح للمندوب بتعديل هذه الحقول: %', diff;
    END IF;

    -- إعادة احتساب المبلغ المطلوب تحصيله تلقائياً بناءً على سعر الأغراض وأجرة التوصيل المحددة من الإدارة
    NEW.items_price := COALESCE(NEW.items_price, OLD.items_price, 0);
    NEW.delivery_fee := OLD.delivery_fee;
    NEW.collection_amount := NEW.items_price + NEW.delivery_fee;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_validate_driver_update ON public.orders;
CREATE TRIGGER tr_validate_driver_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_driver_order_update();

-- محفز تطبيق القيم الافتراضية واحتساب الإجمالي عند إنشاء طلب جديد (يسمح بإسناد المندوب وحساب العمولات للكول سنتر والمدير)
CREATE OR REPLACE FUNCTION public.enforce_order_insert_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_role text;
  v_commission numeric;
BEGIN
  v_role := public.get_my_role();

  IF v_role = 'admin' THEN
    NEW.items_price := COALESCE(NEW.items_price, 0);
    NEW.delivery_fee := COALESCE(NEW.delivery_fee, 0);
    NEW.collection_amount := NEW.items_price + NEW.delivery_fee;
    NEW.status := COALESCE(NEW.status, 'pending');

    IF NEW.driver_id IS NOT NULL THEN
      SELECT commission_percentage INTO v_commission
      FROM public.profiles
      WHERE id = NEW.driver_id;

      v_commission := COALESCE(v_commission, 70);
      NEW.driver_fee := ROUND(NEW.delivery_fee * (v_commission / 100.0), 2);
      NEW.office_fee := NEW.delivery_fee - NEW.driver_fee;
      NEW.assigned_at := COALESCE(NEW.assigned_at, now());
      NEW.status := 'assigned';
    ELSE
      NEW.driver_fee := 0;
      NEW.office_fee := 0;
      NEW.assigned_at := NULL;
    END IF;

  ELSIF v_role = 'call_center' THEN
    NEW.delivery_fee := COALESCE(NEW.delivery_fee, 0);
    NEW.items_price := 0;
    NEW.collection_amount := NEW.delivery_fee;

    -- الكول سنتر يمكنه إسناد مندوب عند إنشاء الطلب
    IF NEW.driver_id IS NOT NULL THEN
      NEW.status := 'assigned';
      SELECT commission_percentage INTO v_commission
      FROM public.profiles
      WHERE id = NEW.driver_id;

      v_commission := COALESCE(v_commission, 70);
      NEW.driver_fee := ROUND(NEW.delivery_fee * (v_commission / 100.0), 2);
      NEW.office_fee := NEW.delivery_fee - NEW.driver_fee;
      NEW.assigned_at := COALESCE(NEW.assigned_at, now());
    ELSE
      NEW.status := 'pending';
      NEW.driver_id := NULL;
      NEW.driver_fee := 0;
      NEW.office_fee := 0;
      NEW.assigned_at := NULL;
    END IF;

  ELSE
    NEW.status := 'pending';
    NEW.driver_id := NULL;
    NEW.items_price := 0;
    NEW.delivery_fee := COALESCE(NEW.delivery_fee, 0);
    NEW.collection_amount := NEW.delivery_fee;
    NEW.driver_fee := 0;
    NEW.office_fee := 0;
    NEW.assigned_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_enforce_order_insert_defaults ON public.orders;
CREATE TRIGGER tr_enforce_order_insert_defaults
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_insert_defaults();

-- محفز احتساب أجور المندوب والمكتب والمجموع عند تغيير الأجرة أو إسناد المندوب
CREATE OR REPLACE FUNCTION public.handle_order_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_commission numeric;
  v_role text;
BEGIN
  v_role := public.get_my_role();

  -- المدير يحدد أجرة التوصيل فقط، ولا يحدد سعر الأغراض؛ سعر الأغراض محصور بالمندوب
  IF v_role = 'admin' AND TG_OP = 'UPDATE' THEN
    NEW.items_price := OLD.items_price;
  END IF;

  -- احتساب إجمالي التحصيل دائماً وتلقائياً: سعر الأغراض + أجرة التوصيل
  NEW.items_price := COALESCE(NEW.items_price, OLD.items_price, 0);
  NEW.delivery_fee := COALESCE(NEW.delivery_fee, OLD.delivery_fee, 0);
  NEW.collection_amount := NEW.items_price + NEW.delivery_fee;

  -- عند الإسناد إلى مندوب: حساب حصة المندوب والمكتب من أجرة التوصيل
  IF NEW.driver_id IS NOT NULL AND (OLD.driver_id IS NULL OR NEW.driver_id <> OLD.driver_id OR NEW.delivery_fee <> OLD.delivery_fee) THEN
    SELECT commission_percentage INTO v_commission
    FROM public.profiles
    WHERE id = NEW.driver_id;

    v_commission := COALESCE(v_commission, 70);
    NEW.driver_fee := ROUND(NEW.delivery_fee * (v_commission / 100.0), 2);
    NEW.office_fee := NEW.delivery_fee - NEW.driver_fee;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_b_handle_order_status_transitions ON public.orders;
CREATE TRIGGER tr_b_handle_order_status_transitions
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_transitions();
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

-- 5. دوال ومحفزات إعادة تصفير تسلسل ترقيم الطلبات (Reset Order IDs Sequence)
CREATE OR REPLACE FUNCTION public.reset_orders_sequence()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  v_role text;
  v_count integer;
  v_max_id bigint;
BEGIN
  v_role := public.get_my_role();
  IF v_role <> 'admin' THEN
    RAISE EXCEPTION 'غير مصرح؛ إعادة تعيين ترقيم الطلبات محصورة بالمدير فقط.';
  END IF;

  SELECT count(*), COALESCE(max(id), 0) INTO v_count, v_max_id FROM public.orders;

  IF v_count = 0 THEN
    PERFORM setval('public.orders_id_seq', 1, false);
    RETURN jsonb_build_object('success', true, 'next_id', 1, 'is_empty', true);
  ELSE
    PERFORM setval('public.orders_id_seq', v_max_id, true);
    RETURN jsonb_build_object('success', true, 'next_id', v_max_id + 1, 'is_empty', false);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_and_reset_orders_sequence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  IF (SELECT count(*) FROM public.orders) = 0 THEN
    PERFORM setval('public.orders_id_seq', 1, false);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tr_reset_orders_seq_on_empty ON public.orders;
CREATE TRIGGER tr_reset_orders_seq_on_empty
  AFTER DELETE ON public.orders
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.check_and_reset_orders_sequence();

