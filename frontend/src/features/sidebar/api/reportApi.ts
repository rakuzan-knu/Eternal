import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface SubmitReportPayload {
  description: string;
  area: string;
  screenshot?: File | null;
}

export const reportApi = {
  submitReport: ({ description, area, screenshot }: SubmitReportPayload) => {
    const formData = new FormData();
    formData.append('description', description);
    formData.append('area', area);
    if (screenshot) formData.append('screenshot', screenshot);

    return api.post('/reports', formData).then((r) => r.data);
  },
};
