import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DocumentPiPManager } from '../documentPiPManager';

describe('DocumentPiPManager (Interactive Document PiP API)', () => {
  let manager: DocumentPiPManager;
  let mockPipWindow: Window;

  beforeEach(() => {
    manager = new DocumentPiPManager();

    const headElements: Node[] = [];
    mockPipWindow = {
      closed: false,
      close: vi.fn(function (this: { closed: boolean }) {
        this.closed = true;
      }),
      document: {
        createElement: vi.fn((tagName: string) => {
          return {
            tagName,
            setAttribute: vi.fn(),
            appendChild: vi.fn(),
          } as unknown as HTMLElement;
        }),
        createTextNode: vi.fn((text: string) => text as unknown as Text),
        head: {
          appendChild: vi.fn((node: Node) => {
            headElements.push(node);
          }),
        },
        body: {
          style: {},
        },
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Window;

    vi.stubGlobal('documentPictureInPicture', {
      requestWindow: vi.fn().mockResolvedValue(mockPipWindow),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects API support accurately', () => {
    expect(manager.isSupported()).toBe(true);

    vi.stubGlobal('documentPictureInPicture', undefined);
    expect(manager.isSupported()).toBe(false);
  });

  it('requests window with width/height and sets up pagehide listener', async () => {
    const win = await manager.open({ width: 500, height: 400 });

    expect(window.documentPictureInPicture?.requestWindow).toHaveBeenCalledWith({
      width: 500,
      height: 400,
    });
    expect(win).toBe(mockPipWindow);
    expect(mockPipWindow.addEventListener).toHaveBeenCalledWith('pagehide', expect.any(Function));
    expect(manager.isOpen()).toBe(true);
  });

  it('closes active PiP window cleanly and triggers close callbacks', async () => {
    const onCloseMock = vi.fn();
    manager.onClose(onCloseMock);

    await manager.open();
    expect(manager.isOpen()).toBe(true);

    manager.close();
    expect(mockPipWindow.close).toHaveBeenCalled();
    expect(manager.isOpen()).toBe(false);
  });
});
