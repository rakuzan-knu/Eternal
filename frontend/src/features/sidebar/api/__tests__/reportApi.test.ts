import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reportApi } from '../reportApi';
import axios from 'axios';

vi.mock('axios', () => {
  const mAxios = {
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    create: vi.fn(() => mAxios),
  };
  return { default: mAxios };
});

describe('reportApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits report with description, area, and optional screenshot', async () => {
    const mockPost = axios.post as unknown as ReturnType<typeof vi.fn>;
    mockPost.mockResolvedValue({ data: { success: true } });

    const file = new File(['dummy'], 'screenshot.png', { type: 'image/png' });
    const res = await reportApi.submitReport({
      description: 'Something broke',
      area: 'Feed',
      screenshot: file,
    });

    expect(mockPost).toHaveBeenCalledWith('/reports', expect.any(FormData));
    expect(res).toEqual({ success: true });
  });
});
