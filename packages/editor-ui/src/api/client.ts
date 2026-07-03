import { useAuthStore } from '../stores/auth.store';

const BASE_URL = '/api/v1';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  requestId: string;
  timestamp: number;
}

class ApiClient {
  private async request<T>(method: string, path: string, body?: any): Promise<ApiResponse<T>> {
    const auth = useAuthStore();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...auth.getAuthHeaders(),
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${BASE_URL}${path}`, options);
    const result: ApiResponse<T> = await response.json();

    if (result.code === 4001) {
      // Token 过期，尝试刷新
      const refreshed = await auth.tryRefreshSession();
      if (refreshed) {
        return this.request<T>(method, path, body);
      }
    }

    return result;
  }

  get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body);
  }

  patch<T>(path: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, body);
  }
}

export const api = new ApiClient();
