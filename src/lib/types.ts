export type AssetType = "fridge" | "toilet";
export type BookingStatus = "pending" | "confirmed" | "reserved" | "active" | "completed" | "cancelled";
export type QuoteStatus = "active" | "converted" | "expired";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type DeliveryStatus = "scheduled" | "out_for_delivery" | "delivered" | "collected" | "cancelled";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  category_code: string;
  description: string;
  quantity_available: number;
  daily_rate: number; // whole Rand
  active: boolean;
}

export interface Booking {
  id: string;
  asset_type: AssetType;
  asset_id: string | null;
  customer: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  days: number;
  status: BookingStatus;
  price_total: number;
  delivery_address: string;
  zone: string;
  site_contact: string;
  created_at: string;
}

export interface QuoteSnapshot {
  asset_type: AssetType;
  asset_id: string | null;
  asset_name: string;
  start_date: string;
  end_date: string;
  days: number;
  zone: string; // human-readable delivery distance description, e.g. "12.4 km from depot"
  delivery_address: string;
  address_lat: number | null;
  address_lon: number | null;
  site_contact: string;
  customer: string;
  waiver: boolean;
  price_total: number;
}

export interface Quote {
  id: string;
  quote_code: string;
  snapshot_json: QuoteSnapshot;
  status: QuoteStatus;
  expires_at: string;
  converted_booking_id: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  gateway: string;
  reference: string;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  booking_id: string;
  invoice_number: string;
  total: number;
  issued_at: string;
}

export interface Delivery {
  id: string;
  booking_id: string;
  origin_address: string;
  destination_address: string;
  distance_km: number | null;
  duration_minutes: number | null;
  delivery_fee: number;
  status: DeliveryStatus;
}

export type AvailabilityVerdict = "available" | "limited" | "unavailable";

export interface AvailabilityResult {
  capacity: number;
  minFree: number;
  days: { date: string; free: number }[];
  status: AvailabilityVerdict;
}
