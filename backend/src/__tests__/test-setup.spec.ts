describe('test-setup', () => {
  it('should allow async timers and promises to resolve cleanly', async () => {
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const start = Date.now();
    await delay(10);
    expect(Date.now() - start).toBeGreaterThanOrEqual(5);
  });
});
