import * as TracingExports from '../index';
import { TraceContext } from '../trace-context';

describe('common/tracing index', () => {
  it('exports TraceContext', () => {
    expect(TracingExports.TraceContext).toBe(TraceContext);
  });
});
