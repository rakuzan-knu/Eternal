import { common } from './common';
import { auth } from './auth';
import { feed } from './feed';
import { stories } from './stories';
import { reels } from './reels';
import { profile } from './profile';
import { chat } from './chat';
import { communities } from './communities';
import { shop } from './shop';
import { search } from './search';
import { notifications } from './notifications';
import { music } from './music';
import { settings } from './settings';
import { content } from './content';
import { plurals } from './plurals';

export const UK = {
  ...common,
  ...auth,
  ...feed,
  ...stories,
  ...reels,
  ...profile,
  ...chat,
  ...communities,
  ...shop,
  ...search,
  ...notifications,
  ...music,
  ...settings,
  ...content,
} as const;

export const UK_PLURALS = plurals;

export const CATALOG_PARTS = {
  common,
  auth,
  feed,
  stories,
  reels,
  profile,
  chat,
  communities,
  shop,
  search,
  notifications,
  music,
  settings,
  content,
};
