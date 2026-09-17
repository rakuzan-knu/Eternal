import { apiClient as api } from './httpClient';
import type { FeatureFlagEvaluationDto } from '@common/contracts';

export interface EvaluateFlagsResponse {
  flags: Record<string, FeatureFlagEvaluationDto>;
}

export const featureFlagsApi = {
  getFlags: async (signal?: AbortSignal): Promise<Record<string, FeatureFlagEvaluationDto>> => {
    const res = await api.get<EvaluateFlagsResponse>('/flags', ...(signal ? [{ signal }] : []));
    return res.data?.flags || {};
  },
};
