// ─── Integration Provider Types ─────────────────────────────────────────────

export type ProviderStatus = 'connected' | 'disconnected' | 'error' | 'pending';
export type ProviderType = 'livekit' | 'sip' | 'twilio' | 'custom';

export interface IntegrationProvider {
  id: string;
  name: string;
  type: ProviderType;
  status: ProviderStatus;
  description: string;
  icon: string;
  config?: Record<string, string>;
  last_connected_at?: string;
  created_at: string;
}

export interface IntegrationTestResult {
  provider_id: string;
  success: boolean;
  latency_ms: number;
  message: string;
  tested_at: string;
}

// ─── Phone Number Types ─────────────────────────────────────────────────────

export type PhoneNumberStatus = 'active' | 'inactive' | 'pending' | 'released';

export interface PhoneNumber {
  id: string;
  number: string;
  country_code: string;
  display_name: string;
  provider: ProviderType;
  status: PhoneNumberStatus;
  assigned_agent_id?: string;
  assigned_agent_name?: string | null;
  sip_trunk_id?: string | null;
  trunk_name?: string | null;
  trunk_provider?: string | null;
  usage?: {
    total_calls: number;
    calls_30d: number;
    total_duration_seconds: number;
  };
  capabilities: PhoneNumberCapabilities;
  monthly_cost: number;
  created_at: string;
}

export interface PhoneNumberCapabilities {
  voice: boolean;
  sms: boolean;
  mms: boolean;
}

export interface PhoneNumbersListResponse {
  phone_numbers: PhoneNumber[];
  total: number;
}

// ─── SIP Trunk Types ────────────────────────────────────────────────────────

export interface SipTrunk {
  id: string;
  name: string;
  provider_name: string;
  sip_host: string;
  username?: string;
  transport: string;
  is_active: boolean;
  registered_in_livekit: boolean;
  livekit_trunk_id?: string;
  created_at: string;
}

export interface SipTrunksResponse {
  sip_trunks: SipTrunk[];
  total: number;
}

export interface SipTrunkTestRequest {
  sip_host: string;
  username?: string;
  password?: string;
}

export interface SipTrunkTestResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface SipTrunkCreateRequest {
  name: string;
  provider_name: string;
  sip_host: string;
  username?: string;
  password?: string;
  transport: string;
  inbound_numbers: string[];
}

// ─── Voice Config Types ─────────────────────────────────────────────────────

export type VoicePreset = 'professional' | 'friendly' | 'casual' | 'formal';
export type VoiceLanguage = 'en-US' | 'en-GB' | 'es-ES' | 'fr-FR' | 'de-DE' | 'hi-IN';

export interface VoiceConfig {
  system_prompt?: string;
  greeting_message?: string;
  voice_preset?: string;
  language?: string;
  goodbye_message?: string;
  interruption_mode?: 'adaptive' | 'strict' | 'none';
  max_call_duration_seconds?: number;
}

export interface VoiceConfigUpdateInput {
  system_prompt?: string;
  greeting_message?: string;
  voice_preset?: VoicePreset;
  language?: VoiceLanguage;
  goodbye_message?: string;
  max_call_duration_seconds?: number;
  interruption_mode?: 'adaptive' | 'strict' | 'none';
  tone?: string;
  behavior_rules?: string;
}

// ─── LiveKit Settings Types ─────────────────────────────────────────────────

export interface LiveKitSettings {
  api_key: string;
  api_secret_masked: string;
  server_url: string;
  region: string;
  connection_status: ProviderStatus;
  rooms_active: number;
  participants_active: number;
  last_health_check: string;
}
