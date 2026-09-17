import { GithubModule } from '../github.module';

describe('GithubModule', () => {
  it('is defined and instantiable', () => {
    const module = new GithubModule();
    expect(module).toBeDefined();
  });
});
