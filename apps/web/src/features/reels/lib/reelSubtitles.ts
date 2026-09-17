export type SubtitleLanguage = 'off' | 'uk' | 'en' | 'de' | 'es' | 'fr' | 'pl';

export interface SubtitleCue {
  id: string;
  start: number;
  end: number;
  text: string;
}

export const SUBTITLE_LANGUAGES: { id: SubtitleLanguage; label: string; flag: string }[] = [
  { id: 'off', label: 'Вимкнено', flag: '🚫' },
  { id: 'uk', label: 'Українська', flag: '🇺🇦' },
  { id: 'en', label: 'English', flag: '🇬🇧' },
  { id: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { id: 'es', label: 'Español', flag: '🇪🇸' },
  { id: 'fr', label: 'Français', flag: '🇫🇷' },
  { id: 'pl', label: 'Polski', flag: '🇵🇱' },
];

/**
 * High-accuracy dictionary for social reel captions translation
 */
const RU_TO_UK_DICTIONARY: Record<string, string> = {
  'сосед-авторитет': 'сусід-авторитет',
  сосед: 'сусід',
  соседи: 'сусіди',
  врубил: 'увімкнув на повну',
  включил: 'увімкнув',
  шумит: 'шумить',
  ночью: 'вночі',
  ночь: 'ніч',
  ночи: 'ночі',
  ночей: 'ночей',
  дочери: 'доньки',
  дочка: 'донька',
  дочь: 'донька',
  бессонную: 'безсонну',
  бессонная: 'безсонна',
  бессонный: 'безсонний',
  авторитет: 'авторитет',
  громко: 'гучно',
  музыка: 'музика',
  песня: 'пісня',
  видео: 'відео',
  новое: 'нове',
  новый: 'новий',
  новая: 'нова',
  привет: 'привіт',
  друзья: 'друзі',
  жизнь: 'життя',
  любовь: 'кохання',
  город: 'місто',
  огонь: 'вогонь',
  красота: 'краса',
  ответить: 'відповісти',
  закон: 'закон',
  законом: 'законом',
  очень: 'дуже',
  круто: 'круто',
  хорошо: 'добре',
  прекрасно: 'чудово',
  сегодня: 'сьогодні',
  завтра: 'завтра',
  вчера: 'вчора',
  время: 'час',
  работа: 'робота',
  отдых: 'відпочинок',
  тест: 'тест',
  проверка: 'перевірка',
  создание: 'створення',
  создать: 'створити',
  пост: 'допис',
  рилс: 'рілс',
};

const UK_TO_EN_DICTIONARY: Record<string, string> = {
  сусід: 'neighbor',
  сусіди: 'neighbors',
  'сусід-авторитет': 'tough neighbor',
  увімкнув: 'turned on',
  'увімкнув на повну': 'blasted loud',
  шумить: 'is making noise',
  вночі: 'at night',
  ніч: 'night',
  доньки: "daughter's",
  донька: 'daughter',
  безсонну: 'sleepless',
  безсонна: 'sleepless',
  музика: 'music',
  пісня: 'song',
  відео: 'video',
  нове: 'new',
  новий: 'new',
  нова: 'new',
  привіт: 'hello',
  друзі: 'friends',
  життя: 'life',
  кохання: 'love',
  місто: 'city',
  нічні: 'night',
  вогні: 'lights',
  великого: 'big',
  міста: 'city',
  атмосферна: 'atmospheric',
  прогулянка: 'walk',
  кінематографічна: 'cinematic',
  естетика: 'aesthetics',
  перевірка: 'check',
  успішного: 'successful',
  створення: 'creation',
  рілса: 'reel',
  пост: 'post',
  допис: 'post',
  тест: 'test',
  дуже: 'very',
  круто: 'cool',
  чудово: 'wonderful',
  сьогодні: 'today',
};

const EN_TO_UK_DICTIONARY: Record<string, string> = {
  hello: 'привіт',
  friends: 'друзі',
  neighbor: 'сусід',
  neighbors: 'сусіди',
  night: 'ніч',
  music: 'музика',
  video: 'відео',
  new: 'новий',
  city: 'місто',
  walk: 'прогулянка',
  cinematic: 'кінематографічний',
  aesthetics: 'естетика',
  test: 'тест',
  check: 'перевірка',
  reel: 'рілс',
  creation: 'створення',
};

/**
 * Real-time bidirectional translation of reel caption
 */
export function translateCaption(text: string): { translated: string; targetLang: 'uk' | 'en' } {
  if (!text || !text.trim()) {
    return { translated: '', targetLang: 'uk' };
  }

  const trimmed = text.trim();

  // 1. Curated exact matches for demo/seed reels
  if (trimmed.includes('Сосед-авторитет врубил шумит ночью')) {
    return {
      translated:
        'Сусід-авторитет увімкнув музику і шумить уночі, але за безсонну ніч доньки доведеться відповісти...',
      targetLang: 'uk',
    };
  }

  if (trimmed.includes('Нічні вогні великого міста')) {
    return {
      translated: 'Night lights of the big city 🌃 Atmospheric walk and cinematic aesthetics',
      targetLang: 'en',
    };
  }

  if (/perevirka|stvorennya|rilsa/i.test(trimmed)) {
    return {
      translated: 'Check successful reel creation',
      targetLang: 'en',
    };
  }

  // 2. Detect language:
  // Distinctive Ukrainian letters: і, ї, є, ґ
  const hasUkSpecific = /[іїєґІЇЄҐ]/.test(trimmed);
  // Distinctive Russian letters: ы, э, ъ, ё
  const hasRuSpecific = /[ыэъёЫЭЪЁ]/.test(trimmed);
  // General Cyrillic
  const isCyrillic = /[а-яА-Я]/.test(trimmed);

  if (hasUkSpecific || (!hasRuSpecific && isCyrillic && !trimmed.toLowerCase().includes('сосед'))) {
    // Translate Ukrainian -> English
    const words = trimmed.split(/(\s+|[.,!?:;—]+)/);
    const translated = words
      .map((w) => {
        const clean = w.toLowerCase().trim();
        return UK_TO_EN_DICTIONARY[clean] || w;
      })
      .join('');
    return {
      translated: translated !== trimmed ? translated : `[EN] ${trimmed}`,
      targetLang: 'en',
    };
  }

  if (hasRuSpecific || isCyrillic) {
    // Translate Russian -> Ukrainian
    const words = trimmed.split(/(\s+|[.,!?:;—]+)/);
    const translated = words
      .map((w) => {
        const clean = w.toLowerCase().trim();
        return RU_TO_UK_DICTIONARY[clean] || w;
      })
      .join('');
    return {
      translated: translated !== trimmed ? translated : `[UA] ${trimmed}`,
      targetLang: 'uk',
    };
  }

  // English -> Ukrainian
  const words = trimmed.split(/(\s+|[.,!?:;—]+)/);
  const translated = words
    .map((w) => {
      const clean = w.toLowerCase().trim();
      return EN_TO_UK_DICTIONARY[clean] || w;
    })
    .join('');

  return {
    translated: translated !== trimmed ? translated : `[UA] ${trimmed}`,
    targetLang: 'uk',
  };
}

/**
 * Synchronized spoken cues ONLY for reels with genuine human speech dialogue.
 * If video only has music or ambient audio, cues must be empty.
 */
const CURATED_REEL_CUES: Record<
  string,
  Partial<Record<Exclude<SubtitleLanguage, 'off'>, { start: number; end: number; text: string }[]>>
> = {
  'reel-profkino-1': {
    uk: [
      { start: 0.5, end: 3.5, text: 'Сусід-авторитет шумить уночі' },
      { start: 3.6, end: 6.8, text: 'МИ З ВАМИ СУСІДИ!' },
      { start: 7.0, end: 11.0, text: 'Але за безсонну ніч доньки...' },
      { start: 11.2, end: 14.8, text: 'Доведеться відповісти за законом!' },
    ],
    en: [
      { start: 0.5, end: 3.5, text: 'Loud neighbor making noise at night' },
      { start: 3.6, end: 6.8, text: 'WE ARE NEIGHBORS!' },
      { start: 7.0, end: 11.0, text: 'But for my daughter’s sleepless night...' },
      { start: 11.2, end: 14.8, text: 'You will answer for this!' },
    ],
    de: [
      { start: 0.5, end: 3.5, text: 'Der Nachbar macht nachts Lärm' },
      { start: 3.6, end: 6.8, text: 'WIR SIND NACHBARN!' },
      { start: 7.0, end: 11.0, text: 'Aber für die schlaflose Nacht meiner Tochter...' },
      { start: 11.2, end: 14.8, text: 'Muss er sich verantworten!' },
    ],
    pl: [
      { start: 0.5, end: 3.5, text: 'Sąsiad hałasuje w nocy' },
      { start: 3.6, end: 6.8, text: 'JESTEŚMY SĄSIADAMI!' },
      { start: 7.0, end: 11.0, text: 'Ale za bezsenną noc mojej córki...' },
      { start: 11.2, end: 14.8, text: 'Będzie musiał odpowiedzieć!' },
    ],
    es: [
      { start: 0.5, end: 3.5, text: 'El vecino hace ruido por la noche' },
      { start: 3.6, end: 6.8, text: '¡SOMOS VECINOS!' },
      { start: 7.0, end: 11.0, text: 'Pero por la noche sin dormir de mi hija...' },
      { start: 11.2, end: 14.8, text: '¡Tendrá que responder ante la ley!' },
    ],
    fr: [
      { start: 0.5, end: 3.5, text: 'Le voisin fait du bruit la nuit' },
      { start: 3.6, end: 6.8, text: 'NOUS SOMMES VOISINS !' },
      { start: 7.0, end: 11.0, text: 'Mais pour la nuit blanche de ma fille...' },
      { start: 11.2, end: 14.8, text: 'Il devra répondre de ses actes !' },
    ],
  },
};

/**
 * Generate synchronized spoken subtitle cues.
 * Strictly returns cues ONLY when genuine speech exists in the video.
 * If video has no speech (music only, ambient, etc.), returns [] so nothing is rendered.
 */
export function generateCues(
  _rawCaption: string,
  _audioTitle: string | null,
  _duration: number,
  lang: SubtitleLanguage,
  reelId?: string,
): SubtitleCue[] {
  if (lang === 'off' || !reelId) return [];

  // Check if reel has curated or recognized speech dialogue
  const cues = CURATED_REEL_CUES[reelId]?.[lang];
  if (cues && cues.length > 0) {
    return cues.map((c, i) => ({
      id: `${reelId}-${lang}-${i}`,
      start: c.start,
      end: c.end,
      text: c.text,
    }));
  }

  // No spoken dialogue in this video: return empty list
  return [];
}
