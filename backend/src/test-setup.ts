afterAll(async () => {
  // Allow pending async microtasks/timers to drain cleanly before Jest terminates
  await new Promise((resolve) => setTimeout(resolve, 100));
});
