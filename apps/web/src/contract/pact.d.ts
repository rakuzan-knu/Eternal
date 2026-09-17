declare module '@pact-foundation/pact' {
  export class PactV3 {
    constructor(options: { consumer: string; provider: string; port?: number; dir?: string });
    given(...args: any[]): this;
    uponReceiving(...args: any[]): this;
    withRequest(...args: any[]): this;
    willRespondWith(...args: any[]): this;
    addInteraction(interaction: any): this;
    executeTest(fn: (mockServer: any) => Promise<any>): Promise<any>;
  }

  export const MatchersV3: {
    like: (...args: any[]) => any;
    eachLike: (...args: any[]) => any;
    string: (...args: any[]) => any;
    integer: (...args: any[]) => any;
    boolean: (...args: any[]) => any;
    uuid: (...args: any[]) => any;
    regex: (...args: any[]) => any;
    nullValue: () => any;
  };
}
