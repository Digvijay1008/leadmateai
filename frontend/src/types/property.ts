export interface Property {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  property_type: PropertyType;
  status: PropertyStatus;
  price: number;
  price_unit: ' INR' | 'Lakh' | 'Crore';
  area: number;
  area_unit: 'sqft' | 'sqm' | 'acre';
  bedrooms: number | null;
  bathrooms: number | null;
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: { lat: number; lng: number };
  };
  features: string[];
  images: string[];
  amenities: string[];
  project_id: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  created_at: string;
  updated_at: string;
}

export type PropertyType = 
  | 'apartment' 
  | 'villa' 
  | 'house' 
  | 'plot' 
  | 'commercial' 
  | 'industrial';

export type PropertyStatus = 
  | 'available' 
  | 'sold' 
  | 'under_offer' 
  | 'inactive';

export interface PropertyFilters {
  property_type?: PropertyType;
  status?: PropertyStatus;
  city?: string;
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
  max_bedrooms?: number;
  search?: string;
}

export interface PropertyCreateInput {
  title: string;
  description?: string;
  property_type: PropertyType;
  price: number;
  price_unit?: 'INR' | 'Lakh' | 'Crore';
  area: number;
  area_unit?: 'sqft' | 'sqm' | 'acre';
  bedrooms?: number;
  bathrooms?: number;
  location: Property['location'];
  features?: string[];
  images?: string[];
  amenities?: string[];
  project_id?: string;
  owner_name?: string;
  owner_phone?: string;
}

export interface PropertyListResponse {
  properties: Property[];
  total: number;
  page: number;
  page_size: number;
}
