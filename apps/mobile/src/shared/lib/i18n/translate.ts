import { UK, UK_PLURALS } from './catalog';
import { getLanguage, getLocale, type Language } from './language';

export type MessageKey = keyof typeof UK;
export type PluralKey = keyof typeof UK_PLURALS;
type Vars = Record<string, string | number>;

const fill = (template: string, vars?: Vars) =>
  vars
    ? template.replace(/\{(\w+)\}/g, (match, name: string) => String(vars[name] ?? match))
    : template;

const english = (key: string) => {
  const context = key.indexOf('|');
  return context === -1 ? key : key.slice(0, context);
};

export function tr(key: MessageKey, vars?: Vars, language: Language = getLanguage()): string {
  return fill(language === 'uk' ? UK[key] : english(key), vars);
}

export const msg = <K extends MessageKey>(key: K): K => key;

const isMessageKey = (text: string): text is MessageKey => Object.hasOwn(UK, text);

export function trKnown<T extends string | undefined>(
  text: T,
  language: Language = getLanguage(),
): T | string {
  return text && isMessageKey(text) ? tr(text, undefined, language) : text;
}

export interface EnglishForms<K extends PluralKey> {
  one: string;
  other: K;
}

export function plural<K extends PluralKey>(
  count: number,
  forms: EnglishForms<K>,
  vars?: Vars,
  language: Language = getLanguage(),
): string {
  const rule = new Intl.PluralRules(getLocale(language)).select(count);
  const values = { count: formatNumber(count, language), ...vars };
  if (language === 'uk') {
    const uk: Record<string, string> = UK_PLURALS[forms.other];
    return fill(uk[rule] ?? uk.other ?? forms.other, values);
  }
  return fill(rule === 'one' ? forms.one : forms.other, values);
}

export function formatNumber(value: number, language: Language = getLanguage()) {
  return new Intl.NumberFormat(getLocale(language)).format(value);
}

export function formatDate(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions,
  language: Language = getLanguage(),
) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(getLocale(language), options).format(date);
}
