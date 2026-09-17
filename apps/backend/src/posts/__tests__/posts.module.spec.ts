import { PostsModule } from '../posts.module';

describe('PostsModule', () => {
  it('is defined and instantiable', () => {
    const module = new PostsModule();
    expect(module).toBeDefined();
  });
});
