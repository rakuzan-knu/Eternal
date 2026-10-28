export const plurals = {
  '{count} members': {
    one: '{count} учасник',
    few: '{count} учасники',
    many: '{count} учасників',
    other: '{count} учасника',
  },
  'Sign out {count} devices?': {
    one: 'Вийти на {count} пристрої?',
    few: 'Вийти на {count} пристроях?',
    many: 'Вийти на {count} пристроях?',
    other: 'Вийти на {count} пристрою?',
  },
  'Add {count} people': {
    one: 'Додати {count} людину',
    few: 'Додати {count} людей',
    many: 'Додати {count} людей',
    other: 'Додати {count} людини',
  },
  '{count} photos': {
    one: '{count} фото',
    few: '{count} фото',
    many: '{count} фото',
    other: '{count} фото',
  },
  '{count} votes': {
    one: '{count} голос',
    few: '{count} голоси',
    many: '{count} голосів',
    other: '{count} голосу',
  },
  '{count} views': {
    one: '{count} перегляд',
    few: '{count} перегляди',
    many: '{count} переглядів',
    other: '{count} перегляду',
  },
  '{count} posts': {
    one: '{count} допис',
    few: '{count} дописи',
    many: '{count} дописів',
    other: '{count} допису',
  },
  '{count} songs': {
    one: '{count} пісня',
    few: '{count} пісні',
    many: '{count} пісень',
    other: '{count} пісні',
  },
  '{count} folders': {
    one: '{count} папка',
    few: '{count} папки',
    many: '{count} папок',
    other: '{count} папки',
  },
  '{count} tracks': {
    one: '{count} трек',
    few: '{count} треки',
    many: '{count} треків',
    other: '{count} треку',
  },
} as const satisfies Record<string, { one: string; few: string; many: string; other: string }>;
