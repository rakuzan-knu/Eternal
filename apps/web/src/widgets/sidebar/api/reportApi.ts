import { apiClient } from '@/shared/api/httpClient';

/**
 * Report-problem API.
 *
 * Enterprise boundary: ALL HTTP goes through the shared `apiClient`
 * (auth refresh, X-Idempotency-Key, /v1 baseURL, 429/401 handling).
 * The previous standalone axios instance bypassed all of that — token
 * expiry during a report silently 401'd, and retries could double-submit.
 */
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

    return apiClient.post('/reports', formData).then((r) => r.data);
  },
};
