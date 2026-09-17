import { MessengerModule } from '../messenger.module';

describe('MessengerModule', () => {
  it('is defined and instantiable', () => {
    const module = new MessengerModule();
    expect(module).toBeDefined();
  });
});
