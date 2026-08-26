import { StoriesModule } from '../stories.module';

describe('StoriesModule', () => {
  it('is defined and instantiable', () => {
    const module = new StoriesModule();
    expect(module).toBeDefined();
  });
});
