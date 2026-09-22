export interface CustomerAddress {
  id: string;
  customer_id: string;
  address: string;
  maps_url?: string | null;
  title?: string | null;
  is_default?: boolean;
  created_at?: string;
  last_used_at?: string;
}

export interface Customer {
  id?: string;
  phone: string;
  name: string;
  address: string;
  maps_url?: string | null;
  backup_phone?: string | null;
  created_at?: string;
  addresses?: CustomerAddress[];
}

export type UserRole = 'admin' | 'call_center' | 'driver';

export interface Profile {
  id: string;
  name: string;
  full_name?: string;
  phone?: string;
  role: UserRole;
  commission_percentage?: number;
  created_at?: string;
}

export type OrderStatus = 'pending' | 'assigned' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';

export interface Order {
  id?: number | string;
  customer_id?: string | null;
  driver_id?: string | null;
  driver?: Profile | null;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  backup_phone?: string | null;
  order_details: string;
  maps_url?: string | null;
  collection_amount: number;
  delivery_fee: number;
  driver_fee: number;
  office_fee: number;
  status: OrderStatus;
  created_at?: string;
}

export interface OrderFormData {
  customer_phone: string;
  customer_name: string;
  delivery_address: string;
  backup_phone: string;
  order_details: string;
  maps_url: string;
  collection_amount: string | number;
  delivery_fee: string | number;
  driver_fee: string | number;
  office_fee: string | number;
}
