import axios from 'axios';
import { ENV } from '../config/env';

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ListQueryParams {
  limit?: number;
  offset?: number;
}

export const DEFAULT_LIST_QUERY: Required<ListQueryParams> = {
  limit: 100,
  offset: 0,
};

export function withDefaultListQuery(params?: ListQueryParams) {
  return {
    ...DEFAULT_LIST_QUERY,
    ...params,
  };
}
