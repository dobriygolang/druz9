import { apiClient } from '@/shared/api/base';

export interface ConfigItem {
  key: string;
  value: string;
  type: string;
  writable: boolean;
  usage: string;
  group: string;
}

export interface ConfigListResponse {
  configs: ConfigItem[];
}

export interface ConfigUpdateRequest {
  value: string;
}

export interface ConfigUpdateResponse {
  key: string;
  value: string;
  success: boolean;
}

export const adminApi = {
  listConfig: async (): Promise<ConfigItem[]> => {
    const response = await apiClient.get<ConfigListResponse>('/api/admin/config');
    return response.data.configs;
  },

  getConfig: async (key: string): Promise<ConfigItem> => {
    const response = await apiClient.get<ConfigItem>(`/api/admin/config/${key}`);
    return response.data;
  },

  updateConfig: async (key: string, value: string): Promise<ConfigUpdateResponse> => {
    const response = await apiClient.put<ConfigUpdateResponse>(
      `/api/admin/config/${key}`,
      { value }
    );
    return response.data;
  },

  setUserTrusted: async (userId: string, isTrusted: boolean): Promise<void> => {
    await apiClient.patch(`/api/admin/users/${userId}/trust`, { isTrusted });
  },
};