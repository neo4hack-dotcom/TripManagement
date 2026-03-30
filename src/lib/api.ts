import {
  ApprovalProfile,
  ApprovalWorkflowConfig,
  CostCenter,
  LocalLlmConfig,
  TravelRequestProfile,
  TravelPolicy,
  TripRequest,
  User,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || '/api';

export interface AppStatePayload {
  users: User[];
  trips: TripRequest[];
  costCenters: CostCenter[];
  policy: TravelPolicy;
  workflowConfig: ApprovalWorkflowConfig;
  llmConfig: LocalLlmConfig;
  requestProfiles: TravelRequestProfile[];
  approvalProfiles: ApprovalProfile[];
}

export interface BootstrapResponse extends AppStatePayload {
  currentUser: User | null;
}

interface LoginResponse {
  user: User;
}

interface LlmModelsResponse {
  data: Array<{id: string; owned_by?: string}>;
}

interface LlmTestResponse {
  content: string;
  model: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;

    try {
      const payload = (await response.json()) as {detail?: string};
      if (payload.detail) {
        detail = payload.detail;
      }
    } catch {
      // Keep the generic detail when the body is empty or not JSON.
    }

    throw new Error(detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  bootstrap() {
    return request<BootstrapResponse>('/bootstrap');
  },
  login(email: string, password: string) {
    return request<LoginResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({email, password}),
    });
  },
  addTrip(trip: TripRequest) {
    return request<AppStatePayload>('/trips', {
      method: 'POST',
      body: JSON.stringify(trip),
    });
  },
  updateTripStatus(tripId: string, status: TripRequest['status']) {
    return request<AppStatePayload>(`/trips/${tripId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({status}),
    });
  },
  addUser(user: User) {
    return request<AppStatePayload>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },
  updateUser(user: User) {
    return request<AppStatePayload>(`/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify(user),
    });
  },
  deleteUser(userId: string) {
    return request<AppStatePayload>(`/users/${userId}`, {
      method: 'DELETE',
    });
  },
  addCostCenter(costCenter: CostCenter) {
    return request<AppStatePayload>('/cost-centers', {
      method: 'POST',
      body: JSON.stringify(costCenter),
    });
  },
  updateCostCenter(costCenter: CostCenter) {
    return request<AppStatePayload>(`/cost-centers/${costCenter.id}`, {
      method: 'PUT',
      body: JSON.stringify(costCenter),
    });
  },
  deleteCostCenter(costCenterId: string) {
    return request<AppStatePayload>(`/cost-centers/${costCenterId}`, {
      method: 'DELETE',
    });
  },
  updatePolicy(policy: TravelPolicy) {
    return request<AppStatePayload>('/policy', {
      method: 'PUT',
      body: JSON.stringify(policy),
    });
  },
  updateWorkflowConfig(workflowConfig: ApprovalWorkflowConfig) {
    return request<AppStatePayload>('/workflow-config', {
      method: 'PUT',
      body: JSON.stringify(workflowConfig),
    });
  },
  updateLlmConfig(llmConfig: LocalLlmConfig) {
    return request<AppStatePayload>('/llm-config', {
      method: 'PUT',
      body: JSON.stringify(llmConfig),
    });
  },
  resetDemoData() {
    return request<AppStatePayload>('/admin/reset', {
      method: 'POST',
    });
  },
  exportDatabase() {
    return request<AppStatePayload>('/admin/export');
  },
  importDatabase(payload: AppStatePayload) {
    return request<AppStatePayload>('/admin/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  loadLlmModels(config: LocalLlmConfig) {
    return request<LlmModelsResponse>('/llm/models', {
      method: 'POST',
      body: JSON.stringify({config}),
    });
  },
  testLlm(config: LocalLlmConfig) {
    return request<LlmTestResponse>('/llm/test', {
      method: 'POST',
      body: JSON.stringify({config}),
    });
  },
  addRequestProfile(profile: TravelRequestProfile) {
    return request<AppStatePayload>('/request-profiles', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  },
  updateRequestProfile(profile: TravelRequestProfile) {
    return request<AppStatePayload>(`/request-profiles/${profile.id}`, {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },
  deleteRequestProfile(profileId: string) {
    return request<AppStatePayload>(`/request-profiles/${profileId}`, {
      method: 'DELETE',
    });
  },
  addApprovalProfile(profile: ApprovalProfile) {
    return request<AppStatePayload>('/approval-profiles', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  },
  updateApprovalProfile(profile: ApprovalProfile) {
    return request<AppStatePayload>(`/approval-profiles/${profile.id}`, {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },
  deleteApprovalProfile(profileId: string) {
    return request<AppStatePayload>(`/approval-profiles/${profileId}`, {
      method: 'DELETE',
    });
  },
};
