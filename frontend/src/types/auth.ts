export interface Tenant {
  id: string;
  name: string;
  email: string;
  balance: number;
  widgetKey?: string;
  allowedDomains?: string[];
}

export interface AuthResponse {
  token: string;
  tenant: Tenant;
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

export interface SignupCredentials {
  email: string;
  password?: string;
  businessName: string;
  ownerName: string;
  phone?: string;
}
