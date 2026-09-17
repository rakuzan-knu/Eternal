declare module '@pact-foundation/pact' {
  export class Verifier {
    constructor(options: {
      providerBaseUrl: string;
      pactUrls: string[];
      stateHandlers?: Record<string, () => Promise<Record<string, unknown>>>;
      customProviderHeaders?: string[];
    });
    verifyProvider(): Promise<any>;
  }
}
