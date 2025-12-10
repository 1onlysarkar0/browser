import { create } from 'zustand';
import { urlApi } from '@/lib/api';

interface Url {
  id: string;
  url: string;
  label: string;
  enabled: boolean;
  description?: string;
  runIntervalSeconds: number;
  lastRunAt?: string;
  nextScheduledAt?: string;
  errorCount: number;
  successCount: number;
  screenshots?: any[];
  executionLogs?: any[];
}

interface UrlState {
  urls: Url[];
  currentUrl: Url | null;
  isLoading: boolean;
  error: string | null;
  fetchUrls: () => Promise<void>;
  fetchUrl: (id: string) => Promise<void>;
  createUrl: (data: any) => Promise<Url>;
  updateUrl: (id: string, data: any) => Promise<void>;
  deleteUrl: (id: string) => Promise<void>;
  toggleUrlStatus: (id: string) => Promise<void>;
  runUrl: (id: string) => Promise<void>;
  captureScreenshot: (id: string) => Promise<void>;
}

export const useUrlStore = create<UrlState>((set, get) => ({
  urls: [],
  currentUrl: null,
  isLoading: false,
  error: null,

  fetchUrls: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await urlApi.getAll();
      set({ urls: response.data.urls, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchUrl: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await urlApi.getById(id);
      set({ currentUrl: response.data.url, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createUrl: async (data: any) => {
    const response = await urlApi.create(data);
    const newUrl = response.data.url;
    set((state) => ({ urls: [newUrl, ...state.urls] }));
    return newUrl;
  },

  updateUrl: async (id: string, data: any) => {
    const response = await urlApi.update(id, data);
    const updatedUrl = response.data.url;
    set((state) => ({
      urls: state.urls.map((u) => (u.id === id ? updatedUrl : u)),
      currentUrl: state.currentUrl?.id === id ? updatedUrl : state.currentUrl,
    }));
  },

  deleteUrl: async (id: string) => {
    await urlApi.delete(id);
    set((state) => ({
      urls: state.urls.filter((u) => u.id !== id),
      currentUrl: state.currentUrl?.id === id ? null : state.currentUrl,
    }));
  },

  toggleUrlStatus: async (id: string) => {
    const response = await urlApi.toggleStatus(id);
    const updatedUrl = response.data.url;
    set((state) => ({
      urls: state.urls.map((u) => (u.id === id ? updatedUrl : u)),
      currentUrl: state.currentUrl?.id === id ? updatedUrl : state.currentUrl,
    }));
  },

  runUrl: async (id: string) => {
    await urlApi.run(id);
  },

  captureScreenshot: async (id: string) => {
    await urlApi.captureScreenshot(id);
  },
}));
