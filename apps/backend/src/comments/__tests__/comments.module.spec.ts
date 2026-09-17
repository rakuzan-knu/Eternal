import { CommentsModule } from '../comments.module';

describe('CommentsModule', () => {
  it('is defined and instantiable', () => {
    const module = new CommentsModule();
    expect(module).toBeDefined();
  });
});
