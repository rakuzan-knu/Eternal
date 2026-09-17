/**
 * AI Live Summary Engine («What did I miss?»)
 *
 * Capabilities:
 * - Rolling transcript accumulator with a 15-minute sliding window.
 * - Generates instantaneous multi-dimensional catch-up summaries:
 *   - Key Topics Discussed
 *   - Action Items & Commitments
 *   - Current Real-time Context
 * - Hybrid Processing:
 *   - Uses Gemini 1.5 Flash when VITE_GEMINI_API_KEY is available.
 *   - Zero-cost offline extractive NLP summarizer with TextRank-inspired sentence
 *     scoring and action-verb heuristic extraction when offline or without API key.
 */

export interface TranscriptSegment {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: number;
}

export interface LiveSummaryResult {
  keyTopics: string[];
  actionItems: string[];
  currentContext: string;
  speakerCount: number;
  segmentCount: number;
  timeRangeMinutes: number;
  generatedAt: number;
  provider: 'gemini' | 'local_nlp';
}

const STOP_WORDS = new Set([
  'a',
  'about',
  'above',
  'after',
  'again',
  'against',
  'all',
  'am',
  'an',
  'and',
  'any',
  'are',
  'aren',
  'as',
  'at',
  'be',
  'because',
  'been',
  'before',
  'being',
  'below',
  'between',
  'both',
  'but',
  'by',
  'can',
  'could',
  'did',
  'do',
  'does',
  'doing',
  'down',
  'during',
  'each',
  'few',
  'for',
  'from',
  'further',
  'had',
  'has',
  'have',
  'having',
  'he',
  'her',
  'here',
  'hers',
  'herself',
  'him',
  'himself',
  'his',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'isn',
  'it',
  'its',
  'itself',
  'just',
  'll',
  'm',
  'me',
  'might',
  'more',
  'most',
  'my',
  'myself',
  'no',
  'nor',
  'not',
  'now',
  'o',
  'of',
  'off',
  'on',
  'once',
  'only',
  'or',
  'other',
  'our',
  'ours',
  'ourselves',
  'out',
  'over',
  'own',
  're',
  's',
  'same',
  'she',
  'should',
  'so',
  'some',
  'such',
  't',
  'than',
  'that',
  'the',
  'their',
  'theirs',
  'them',
  'themselves',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'to',
  'too',
  'under',
  'until',
  'up',
  've',
  'very',
  'was',
  'wasn',
  'we',
  'were',
  'weren',
  'what',
  'when',
  'where',
  'which',
  'while',
  'who',
  'whom',
  'why',
  'will',
  'with',
  'won',
  'would',
  'y',
  'you',
  'your',
  'yours',
  'yourself',
  'yourselves',
  // Russian stopwords
  'и',
  'в',
  'во',
  'не',
  'что',
  'он',
  'на',
  'я',
  'с',
  'со',
  'как',
  'а',
  'то',
  'все',
  'она',
  'так',
  'его',
  'но',
  'да',
  'ты',
  'к',
  'у',
  'же',
  'вы',
  'за',
  'бы',
  'по',
  'только',
  'ее',
  'мне',
  'было',
  'вот',
  'от',
  'меня',
  'еще',
  'нет',
  'о',
  'из',
  'ему',
  'теперь',
  'когда',
  'даже',
  'ну',
  'вдруг',
  'ли',
  'если',
  'уже',
  'или',
  'ни',
  'быть',
  'был',
  'него',
  'до',
  'вас',
  'нибудь',
  'опять',
  'уж',
  'вам',
  'ведь',
  'там',
  'потом',
  'себя',
  'ничего',
  'ей',
  'может',
  'они',
  'тут',
  'где',
  'есть',
]);

const ACTION_ITEM_REGEX =
  /(\b(need to|will do|should|must|action|todo|let's|agreed|decided|deadline|task|assign|follow up|schedule|take care of|push|merge|review|deploy|test)\b|надо|нужно|сделаем|договорились|решили|задача|дедлайн|проверим|задеплоим)/i;

export class RollingLiveSummaryEngine {
  private segments: TranscriptSegment[] = [];
  private readonly windowMs: number;
  private apiKey: string | null = null;

  constructor(windowMinutes = 15, customApiKey?: string) {
    this.windowMs = windowMinutes * 60 * 1000;
    if (customApiKey) {
      this.apiKey = customApiKey;
    } else if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
      this.apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string).trim() || null;
    }
  }

  public addSegment(speakerId: string, speakerName: string, text: string): TranscriptSegment {
    const trimmed = text.trim();
    const now = Date.now();
    this.pruneOldSegments(now);

    const segment: TranscriptSegment = {
      id: `seg_${now}_${Math.random().toString(36).substring(2, 7)}`,
      speakerId,
      speakerName,
      text: trimmed,
      timestamp: now,
    };

    if (trimmed.length > 0) {
      this.segments.push(segment);
    }
    return segment;
  }

  public getSegments(): TranscriptSegment[] {
    this.pruneOldSegments(Date.now());
    return [...this.segments];
  }

  public clear(): void {
    this.segments = [];
  }

  private pruneOldSegments(now: number): void {
    const cutoff = now - this.windowMs;
    this.segments = this.segments.filter((s) => s.timestamp >= cutoff);
  }

  /**
   * Generates summary of what happened in the meeting.
   */
  public async generateSummary(): Promise<LiveSummaryResult> {
    this.pruneOldSegments(Date.now());

    const uniqueSpeakers = new Set(this.segments.map((s) => s.speakerName));
    const segmentCount = this.segments.length;

    if (segmentCount === 0) {
      return {
        keyTopics: ['Meeting started. Waiting for participants to speak.'],
        actionItems: [],
        currentContext: 'The conversation is just beginning.',
        speakerCount: 0,
        segmentCount: 0,
        timeRangeMinutes: 0,
        generatedAt: Date.now(),
        provider: 'local_nlp',
      };
    }

    const firstTimestamp = this.segments[0].timestamp;
    const lastTimestamp = this.segments[this.segments.length - 1].timestamp;
    const timeRangeMinutes = Math.max(
      1,
      Math.round((lastTimestamp - firstTimestamp) / (60 * 1000)),
    );

    // 1. Try Gemini generative summary if API key is present
    if (this.apiKey) {
      try {
        const geminiResult = await this.summarizeWithGemini(
          uniqueSpeakers.size,
          segmentCount,
          timeRangeMinutes,
        );
        if (geminiResult) {
          return geminiResult;
        }
      } catch (err) {
        console.warn('[RollingLiveSummary] Gemini API error, falling back to local NLP:', err);
      }
    }

    // 2. Offline Extractive NLP Fallback
    return this.summarizeWithLocalNLP(uniqueSpeakers.size, segmentCount, timeRangeMinutes);
  }

  /**
   * Gemini API structured summary.
   */
  private async summarizeWithGemini(
    speakerCount: number,
    segmentCount: number,
    timeRangeMinutes: number,
  ): Promise<LiveSummaryResult | null> {
    if (!this.apiKey) return null;

    const transcriptText = this.segments.map((s) => `[${s.speakerName}]: ${s.text}`).join('\n');

    const prompt = `You are an AI meeting assistant. Summarize the following rolling call transcript from the last ${timeRangeMinutes} minutes. Return ONLY a valid JSON object matching this schema:
{
  "keyTopics": ["string", "string"],
  "actionItems": ["string", "string"],
  "currentContext": "string"
}

Transcript:
${transcriptText}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API HTTP ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) return null;

    const parsed = JSON.parse(candidateText);
    return {
      keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      currentContext: typeof parsed.currentContext === 'string' ? parsed.currentContext : '',
      speakerCount,
      segmentCount,
      timeRangeMinutes,
      generatedAt: Date.now(),
      provider: 'gemini',
    };
  }

  /**
   * Local 100% offline extractive NLP summarizer.
   */
  public summarizeWithLocalNLP(
    speakerCount: number,
    segmentCount: number,
    timeRangeMinutes: number,
  ): LiveSummaryResult {
    // Collect all sentences
    const sentences: { text: string; speakerName: string; score: number }[] = [];
    const wordFreq = new Map<string, number>();

    this.segments.forEach((seg) => {
      // Split on punctuation (. ! ?)
      const parts = seg.text.split(/([.!?]+)/).filter((p) => p.trim().length > 3);
      for (const part of parts) {
        sentences.push({ text: part.trim(), speakerName: seg.speakerName, score: 0 });
      }

      // Word frequencies
      const tokens = seg.text.toLowerCase().split(/[^\p{L}\p{N}]+/u);
      for (const t of tokens) {
        if (t.length > 3 && !STOP_WORDS.has(t)) {
          wordFreq.set(t, (wordFreq.get(t) || 0) + 1);
        }
      }
    });

    // Score sentences by word importance
    sentences.forEach((s) => {
      const tokens = s.text.toLowerCase().split(/[^\p{L}\p{N}]+/u);
      let score = 0;
      for (const t of tokens) {
        score += wordFreq.get(t) || 0;
      }
      s.score = score / Math.max(1, tokens.length);
    });

    // Extract Top 3-5 Topics / Key Sentences
    const sortedSentences = [...sentences].sort((a, b) => b.score - a.score);
    const topSentences = sortedSentences.slice(0, 4).map((s) => `${s.speakerName}: "${s.text}"`);

    // Extract Action Items via Regex heuristic
    const actionItems: string[] = [];
    sentences.forEach((s) => {
      if (ACTION_ITEM_REGEX.test(s.text)) {
        actionItems.push(`${s.speakerName}: ${s.text}`);
      }
    });

    // Current Context (last 2 segments)
    const recent = this.segments.slice(-2);
    const currentContext =
      recent.length > 0
        ? recent.map((s) => `${s.speakerName}: ${s.text}`).join(' · ')
        : 'Discussion in progress.';

    return {
      keyTopics:
        topSentences.length > 0
          ? topSentences
          : ['General discussion on project updates and coordination.'],
      actionItems:
        actionItems.length > 0 ? actionItems.slice(0, 4) : ['No pending action items detected.'],
      currentContext,
      speakerCount,
      segmentCount,
      timeRangeMinutes,
      generatedAt: Date.now(),
      provider: 'local_nlp',
    };
  }
}

export const globalLiveSummaryEngine = new RollingLiveSummaryEngine();
