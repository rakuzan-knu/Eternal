import { TextPipelineService } from '../text-pipeline.service';

describe('TextPipelineService', () => {
  let service: TextPipelineService;

  beforeEach(() => {
    service = new TextPipelineService();
    service.onModuleInit();
  });

  it('exposes the active backend', () => {
    expect(['ts', 'native']).toContain(service.getBackend());
  });

  it('extracts mentions/hashtags like the legacy scanners', () => {
    expect(service.extractMentions('Hello @alex and @sam!')).toEqual(['alex', 'sam']);
    expect(service.extractHashtags('hi #TypeScript #привет')).toEqual(['#TypeScript', '#привет']);
  });

  it('sanitizes text and processes full pipeline', () => {
    expect(service.sanitizeText('<b>hi</b>')).toBe('hi');
    const r = service.processText('Hello @alex #hi', { maxMentions: 5 });
    expect(r.mentions).toEqual(['alex']);
    expect(r.hashtags).toEqual(['#hi']);
    expect(r.capped).toBe(false);
    expect(r.spam.score).toBe(0);
  });

  it('flags mention bombing for callers to enforce', () => {
    const r = service.processText('@a @b @c @d', { maxMentions: 2 });
    expect(r.capped).toBe(true);
    expect(r.spam.reasons).toContain('TOO_MANY_MENTIONS');
  });
});
