export interface Tenant {
  id: string;
  email: string;
  owner_name: string;
  created_at: string;
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
  owner_name: string;
}

export interface VoiceSession {
  id: string;
  status: string;
  created_at: string;
  transcript: any;
}
