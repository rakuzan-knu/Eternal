import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebGpuBlurShaderPipeline, WGSL_BOKEH_SHADER } from '../webgpuBlurShader';

describe('WebGpuBlurShaderPipeline', () => {
  let pipeline: WebGpuBlurShaderPipeline;

  beforeEach(() => {
    vi.restoreAllMocks();
    pipeline = new WebGpuBlurShaderPipeline();
  });

  it('WGSL shader source contains required shader stages and bokeh convolution', () => {
    expect(WGSL_BOKEH_SHADER).toContain('@vertex');
    expect(WGSL_BOKEH_SHADER).toContain('@fragment');
    expect(WGSL_BOKEH_SHADER).toContain('textureSample');
    expect(WGSL_BOKEH_SHADER).toContain('blurRadius');
    expect(WGSL_BOKEH_SHADER).toContain('Uniforms');
  });

  it('detects WebGPU platform support accurately', () => {
    // 1. Without navigator.gpu
    const originalNavigator = global.navigator;
    // @ts-expect-error mock assignment
    delete global.navigator;
    // @ts-expect-error mock assignment
    global.navigator = {};
    expect(WebGpuBlurShaderPipeline.isSupported()).toBe(false);

    // 2. With navigator.gpu
    // @ts-expect-error mock assignment
    global.navigator = { gpu: {} };
    expect(WebGpuBlurShaderPipeline.isSupported()).toBe(true);

    // Restore
    global.navigator = originalNavigator;
  });

  it('initializes WebGPU pipeline and renders frame to canvas', async () => {
    const mockDevice = {
      createShaderModule: vi.fn().mockReturnValue({}),
      createSampler: vi.fn().mockReturnValue({}),
      createBuffer: vi.fn().mockReturnValue({ destroy: vi.fn() }),
      createBindGroupLayout: vi.fn().mockReturnValue({}),
      createPipelineLayout: vi.fn().mockReturnValue({}),
      createRenderPipeline: vi.fn().mockReturnValue({}),
      createTexture: vi.fn().mockReturnValue({
        createView: vi.fn().mockReturnValue({}),
        destroy: vi.fn(),
      }),
      createBindGroup: vi.fn().mockReturnValue({}),
      createCommandEncoder: vi.fn().mockReturnValue({
        beginRenderPass: vi.fn().mockReturnValue({
          setPipeline: vi.fn(),
          setBindGroup: vi.fn(),
          draw: vi.fn(),
          end: vi.fn(),
        }),
        finish: vi.fn().mockReturnValue({}),
      }),
      queue: {
        writeBuffer: vi.fn(),
        copyExternalImageToTexture: vi.fn(),
        submit: vi.fn(),
      },
      destroy: vi.fn(),
    };

    const mockAdapter = {
      requestDevice: vi.fn().mockResolvedValue(mockDevice),
    };

    const mockContext = {
      configure: vi.fn(),
      getCurrentTexture: vi.fn().mockReturnValue({
        createView: vi.fn().mockReturnValue({}),
      }),
    };

    const mockCanvas = {
      width: 640,
      height: 480,
      getContext: vi.fn().mockReturnValue(mockContext),
    } as unknown as HTMLCanvasElement;

    // Mock GPU
    (global.navigator as unknown as Record<string, unknown>).gpu = {
      requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
      getPreferredCanvasFormat: vi.fn().mockReturnValue('bgra8unorm'),
    };

    const initSuccess = await pipeline.init(mockCanvas);
    expect(initSuccess).toBe(true);

    const mockVideo = {} as HTMLVideoElement;
    pipeline.renderFrame(mockCanvas, mockVideo, { blurRadius: 20 });

    expect(mockDevice.queue.writeBuffer).toHaveBeenCalled();
    expect(mockDevice.queue.copyExternalImageToTexture).toHaveBeenCalled();
    expect(mockDevice.queue.submit).toHaveBeenCalled();

    pipeline.destroy();
    expect(mockDevice.destroy).toHaveBeenCalled();
  });
});
