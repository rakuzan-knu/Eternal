import { Test } from '@nestjs/testing';
import { SerializationModule } from '../serialization.module';
import { FastJsonService } from '../fast-json.service';
import { FastJsonInterceptor } from '../fast-json.interceptor';

describe('SerializationModule', () => {
  it('compiles and provides FastJsonService and FastJsonInterceptor', async () => {
    const module = await Test.createTestingModule({
      imports: [SerializationModule],
    }).compile();

    const service = module.get<FastJsonService>(FastJsonService);
    const interceptor = module.get<FastJsonInterceptor>(FastJsonInterceptor);

    expect(service).toBeDefined();
    expect(interceptor).toBeDefined();
  });
});
