import { Test } from '@nestjs/testing';
import { VersioningModule } from '../versioning.module';
import { DeprecationInterceptor } from '../deprecation.interceptor';
import { MetricsService } from '../../../metrics/metrics.service';
import { AlertingService } from '../../resilience/alerting.service';

describe('VersioningModule', () => {
  it('compiles the module and provides DeprecationInterceptor', async () => {
    const module = await Test.createTestingModule({
      imports: [VersioningModule],
    })
      .overrideProvider(MetricsService)
      .useValue({ recordDeprecatedApiRequest: jest.fn() })
      .overrideProvider(AlertingService)
      .useValue({ sendDeprecatedApiUsageAlert: jest.fn() })
      .compile();

    expect(module).toBeDefined();
    const interceptor = module.get<DeprecationInterceptor>(DeprecationInterceptor);
    expect(interceptor).toBeDefined();
  });
});
