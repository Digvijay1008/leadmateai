import { fetchApi } from '@/lib/api-client';
import {
  IntegrationProvider,
  IntegrationTestResult,
  PhoneNumber,
  PhoneNumbersListResponse,
  VoiceConfig,
  VoiceConfigUpdateInput,
  LiveKitSettings,
  SipTrunkTestRequest,
  SipTrunkTestResponse,
  SipTrunksResponse,
  SipTrunkCreateRequest,
} from '../types';

export const telephonyApi = {
  // ─── Integrations ───────────────────────────────────────────────────────
  getIntegrations: () =>
    fetchApi<IntegrationProvider[]>('/v1/integrations'),

  testIntegration: (providerId: string) =>
    fetchApi<IntegrationTestResult>(`/v1/integrations/${providerId}/test`, {
      method: 'POST',
    }),

  // ─── Phone Numbers ─────────────────────────────────────────────────────
  getPhoneNumbers: () =>
    fetchApi<PhoneNumbersListResponse>('/v1/phone-numbers'),

  addPhoneNumber: (data: { number: string; sip_trunk_id?: string; agent_id?: string }) =>
    fetchApi<{ message: string; phone_number: PhoneNumber }>('/v1/phone-numbers', {
      method: 'POST',
      data,
    }),

  assignPhoneNumber: (numberId: string, agentId: string) =>
    fetchApi<PhoneNumber>(`/v1/phone-numbers/${numberId}/assign`, {
      method: 'POST',
      data: { agent_id: agentId },
    }),

  unassignPhoneNumber: (numberId: string) =>
    fetchApi<PhoneNumber>(`/v1/phone-numbers/${numberId}/unassign`, {
      method: 'POST',
    }),

  // ─── SIP Trunks ────────────────────────────────────────────────────────
  getSipTrunks: () =>
    fetchApi<SipTrunksResponse>('/v1/sip-trunks'),

  testSipTrunk: (data: SipTrunkTestRequest) =>
    fetchApi<SipTrunkTestResponse>('/v1/sip-trunks/test', {
      method: 'POST',
      data,
    }),

  createSipTrunk: (data: SipTrunkCreateRequest) =>
    fetchApi<{ message: string }>('/v1/sip-trunks', {
      method: 'POST',
      data,
    }),

  // ─── Agent Config ────────────────────────────────────────────────────────
  getAgentConfig: () =>
    fetchApi<{ config: VoiceConfig }>('/v1/agent/config').then(res => res.config),

  updateAgentConfig: (data: VoiceConfigUpdateInput) =>
    fetchApi<{ message: string }>('/v1/agent/config', {
      method: 'PUT',
      data,
    }),

  // ─── Providers ─────────────────────────────────────────────────────────
  getVoices: () =>
    fetchApi<{ voices: VoiceOption[] }>('/v1/providers/voices').then(res => res.voices),

  getLLMs: () =>
    fetchApi<{ llms: LLMOption[] }>('/v1/providers/llms').then(res => res.llms),

  // ─── LiveKit Settings ──────────────────────────────────────────────────
  getLiveKitSettings: () =>
    fetchApi<LiveKitSettings>('/v1/livekit/settings'),
};

// ─── Provider Option Types ─────────────────────────────────────────────────

export interface VoiceOption {
  id: string;
  name: string;
  provider: string;
  language: string;
  accent: string;
  gender: string;
  preview_url: string;
}

export interface LLMOption {
  id: string;
  name: string;
  provider: string;
  context_window: number;
}
