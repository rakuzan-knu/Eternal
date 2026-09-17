import { NotFoundException } from '@nestjs/common';
import { E2eeController } from '../e2ee.controller';
import type { E2eeService } from '../e2ee.service';

describe('E2eeController device directory', () => {
  let controller: E2eeController;
  let service: { getPublicKey: jest.Mock; getPublicKeys: jest.Mock };

  beforeEach(() => {
    service = {
      getPublicKey: jest.fn(),
      getPublicKeys: jest.fn(),
    };
    controller = new E2eeController(service as unknown as E2eeService);
  });

  it('lists all devices in a purpose slot', async () => {
    const keys = [
      { userId: 'u1', publicKey: 'AAA', deviceId: 'phone', e2eeVersion: 3 },
      { userId: 'u1', publicKey: 'BBB', deviceId: 'desktop', e2eeVersion: 1 },
    ];
    service.getPublicKeys.mockResolvedValue(keys);

    await expect(controller.getDevices('u1', 'message')).resolves.toEqual({
      userId: 'u1',
      purpose: 'message',
      keys,
    });
    expect(service.getPublicKeys).toHaveBeenCalledWith('u1', 'message');
  });

  it('normalizes unknown purposes to call and returns empty lists as 200', async () => {
    service.getPublicKeys.mockResolvedValue([]);

    await expect(controller.getDevices('u1', 'weird')).resolves.toEqual({
      userId: 'u1',
      purpose: 'call',
      keys: [],
    });
  });

  it('keeps singular 404 semantics for missing keys', async () => {
    service.getPublicKey.mockResolvedValue(null);
    await expect(controller.getKey('u1', 'message')).rejects.toThrow(NotFoundException);
  });
});
