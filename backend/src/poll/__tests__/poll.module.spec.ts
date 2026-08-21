import { PollModule } from '../poll.module';

describe('PollModule', () => {
  it('is defined and instantiable', () => {
    const module = new PollModule();
    expect(module).toBeDefined();
  });
});
