import axios, { AxiosInstance, AxiosError } from 'axios';

interface ApiClientOptions {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class ApiClient {
  private instance: AxiosInstance;

  constructor(options: ApiClientOptions) {
    this.instance = axios.create({
      baseURL: options.baseURL,
      timeout: options.timeout || 10000,
      headers: options.headers || {}
    });
  }

  async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    try {
      const response = await this.instance.get<T>(url, { params });
      return response.data;
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  private handleError(error: AxiosError): never {
    if (error.response) {
      // Server responded with an error status
      throw new Error(`API Error: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('No response received from API');
    } else {
      // Request setup error
      throw new Error(`API Request Error: ${error.message}`);
    }
  }
} 