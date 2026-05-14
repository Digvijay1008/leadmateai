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

  // ─── LiveKit Settings ──────────────────────────────────────────────────
  getLiveKitSettings: () =>
    fetchApi<LiveKitSettings>('/v1/livekit/settings'),
};
