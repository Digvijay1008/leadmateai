import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { telephonyApi } from '../api';
import { VoiceConfigUpdateInput, SipTrunkCreateRequest, SipTrunkTestRequest } from '../types';

// ─── Query Keys ──────────────────────────────────────────────────────────────

export const telephonyKeys = {
  all: ['telephony'] as const,
  integrations: () => [...telephonyKeys.all, 'integrations'] as const,
  phoneNumbers: () => [...telephonyKeys.all, 'phone-numbers'] as const,
  voiceConfig: () => [...telephonyKeys.all, 'voice-config'] as const,
  livekitSettings: () => [...telephonyKeys.all, 'livekit-settings'] as const,
  sipTrunks: () => [...telephonyKeys.all, 'sip-trunks'] as const,
};

// ─── Integrations ────────────────────────────────────────────────────────────

export function useIntegrationsQuery() {
  return useQuery({
    queryKey: telephonyKeys.integrations(),
    queryFn: () => telephonyApi.getIntegrations(),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useTestIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (providerId: string) => telephonyApi.testIntegration(providerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: telephonyKeys.integrations() });
    },
  });
}

// ─── Phone Numbers ───────────────────────────────────────────────────────────

export function usePhoneNumbersQuery() {
  return useQuery({
    queryKey: telephonyKeys.phoneNumbers(),
    queryFn: () => telephonyApi.getPhoneNumbers(),
    staleTime: 60 * 1000,
  });
}

export function useAssignPhoneNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ numberId, agentId }: { numberId: string; agentId: string }) =>
      telephonyApi.assignPhoneNumber(numberId, agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: telephonyKeys.phoneNumbers() });
    },
  });
}

export function useUnassignPhoneNumber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (numberId: string) => telephonyApi.unassignPhoneNumber(numberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: telephonyKeys.phoneNumbers() });
    },
  });
}

// ─── SIP Trunks ───────────────────────────────────────────────────────────

export function useSipTrunksQuery() {
  return useQuery({
    queryKey: telephonyKeys.sipTrunks(),
    queryFn: () => telephonyApi.getSipTrunks(),
    staleTime: 60 * 1000,
  });
}

export function useTestSipTrunk() {
  return useMutation({
    mutationFn: (data: SipTrunkTestRequest) => telephonyApi.testSipTrunk(data),
  });
}

export function useCreateSipTrunk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SipTrunkCreateRequest) => telephonyApi.createSipTrunk(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: telephonyKeys.sipTrunks() });
    },
  });
}

// ─── Agent Config ────────────────────────────────────────────────────────

export function useAgentConfigQuery() {
  return useQuery({
    queryKey: telephonyKeys.voiceConfig(),
    queryFn: () => telephonyApi.getAgentConfig(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useUpdateAgentConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VoiceConfigUpdateInput) => telephonyApi.updateAgentConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: telephonyKeys.voiceConfig() });
    },
  });
}

// ─── LiveKit Settings ────────────────────────────────────────────────────────

export function useLiveKitSettingsQuery() {
  return useQuery({
    queryKey: telephonyKeys.livekitSettings(),
    queryFn: () => telephonyApi.getLiveKitSettings(),
    staleTime: 30 * 1000,
  });
}
