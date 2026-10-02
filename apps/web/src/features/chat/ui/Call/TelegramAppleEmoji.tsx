import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

/**
 * CDN Base URLs
 * Primary: 60 FPS Telegram Animated Emojis (lossless alpha WebP) from Tarikul-Islam-Anik/Telegram-Animated-Emojis
 * Fallback: Apple 64px static PNGs from emoji-datasource-apple
 */
export const TELEGRAM_ANIMATED_CDN =
  'https://cdn.jsdelivr.net/gh/Tarikul-Islam-Anik/Telegram-Animated-Emojis@main';
export const APPLE_PNG_CDN = 'https://cdn.jsdelivr.net/gh/iamcal/emoji-data@master/img-apple-160';
export const APPLE_PNG_FALLBACK_CDN =
  'https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64';

/**
 * Mapping of Unicode emojis to verified 60 FPS Telegram Animated WebP files
 * in the repository: https://github.com/Tarikul-Islam-Anik/Telegram-Animated-Emojis
 *
 * All 64 SAS verification emojis plus popular smileys, animals, and symbols are mapped.
 */
export const TELEGRAM_ANIMATED_EMOJI_MAP: Record<string, string> = {
  // === Popular Gestures & People ===
  '👌': 'People/OK Hand.webp',
  '👍': 'People/Thumbs Up.webp',
  '👎': 'People/Thumbs Down.webp',
  '👋': 'People/Waving Hand.webp',
  '👏': 'People/Clapping Hands.webp',
  '🙏': 'People/Folded Hands.webp',
  '✌️': 'People/Victory Hand.webp',
  '✌': 'People/Victory Hand.webp',
  '💪': 'People/Flexed Biceps.webp',
  '🤝': 'People/Handshake.webp',

  // === SAS Verification Table Emojis (64 Guaranteed Animated) ===
  // Animals (20)
  '🦊': 'Animals and Nature/Fox.webp',
  '🐱': 'Animals and Nature/Cat Face.webp',
  '🐶': 'Animals and Nature/Dog Face.webp',
  '🦁': 'Animals and Nature/Lion.webp',
  '🐯': 'Animals and Nature/Tiger.webp',
  '🐻': 'Animals and Nature/Bear.webp',
  '🐼': 'Animals and Nature/Panda.webp',
  '🐨': 'Animals and Nature/Koala.webp',
  '🐸': 'Animals and Nature/Frog.webp',
  '🐙': 'Animals and Nature/Octopus.webp',
  '🦋': 'Animals and Nature/Butterfly.webp',
  '🦄': 'Animals and Nature/Unicorn.webp',
  '🐝': 'Animals and Nature/Honeybee.webp',
  '🦉': 'Animals and Nature/Owl.webp',
  '🐧': 'Animals and Nature/Penguin.webp',
  '🦔': 'Animals and Nature/Hedgehog.webp',
  '🦇': 'Animals and Nature/Bat.webp',
  '🐵': 'Animals and Nature/Monkey Face.webp',
  '🦜': 'Animals and Nature/Parrot.webp',
  '🦩': 'Animals and Nature/Flamingo.webp',

  // Nature, Space & Elements (12)
  '🌈': 'Animals and Nature/Rainbow.webp',
  '⚡': 'Animals and Nature/High Voltage.webp',
  '🔥': 'Animals and Nature/Fire.webp',
  '⭐': 'Animals and Nature/Star.webp',
  '🌟': 'Animals and Nature/Glowing Star.webp',
  '☀️': 'Animals and Nature/Sun.webp',
  '🌞': 'Animals and Nature/Sun With Face.webp',
  '🌙': 'Animals and Nature/Waning Crescent Moon.webp',
  '🌕': 'Animals and Nature/Full Moon.webp',
  '❄': 'Animals and Nature/Snowflake.webp',
  '🍀': 'Animals and Nature/Four Leaf Clover.webp',
  '🌺': 'Animals and Nature/Hibiscus.webp',

  // Activities, Magic & Celebration (12)
  '🔮': 'Activity/Crystal Ball.webp',
  '🪄': 'Activity/Magic Wand.webp',
  '🎈': 'Activity/Balloon.webp',
  '🎉': 'Activity/Party Popper.webp',
  '🎊': 'Activity/Confetti Ball.webp',
  '🎆': 'Activity/Fireworks.webp',
  '🧨': 'Activity/Firecracker.webp',
  '🏆': 'Activity/Trophy.webp',
  '🥇': 'Activity/1st Place Medal.webp',
  '🎨': 'Activity/Artist Palette.webp',
  '🎭': 'Activity/Performing Arts.webp',
  '🎮': 'Activity/Video Game.webp',

  // Objects, Keys & Treasures (12)
  '💎': 'Objects/Gem Stone.webp',
  '👑': 'Objects/Crown.webp',
  '🗝': 'Objects/Old Key.webp',
  '🔑': 'Objects/Key.webp',
  '💡': 'Objects/Light Bulb.webp',
  '💣': 'Objects/Bomb.webp',
  '🚀': 'Travel and Places/Rocket.webp',
  '🧭': 'Travel and Places/Compass.webp',
  '🎵': 'Objects/Musical Note.webp',
  '🎶': 'Objects/Musical Notes.webp',
  '💰': 'Objects/Money Bag.webp',
  '⏳': 'Objects/Hourglass Done.webp',

  // Food & Delights (8)
  '🍓': 'Food and Drink/Strawberry.webp',
  '🍕': 'Food and Drink/Pizza.webp',
  '🍔': 'Food and Drink/Hamburger.webp',
  '🍟': 'Food and Drink/French Fries.webp',
  '🍿': 'Food and Drink/Popcorn.webp',
  '🍩': 'Food and Drink/Doughnut.webp',
  '🍪': 'Food and Drink/Cookie.webp',
  '🎂': 'Food and Drink/Birthday Cake.webp',

  // === Additional Popular Animals & Nature ===
  '🕊': 'Animals and Nature/Dove.webp',
  '🐥': 'Animals and Nature/Baby Chick.webp',
  '🐣': 'Animals and Nature/Hatching Chick.webp',
  '🦆': 'Animals and Nature/Duck.webp',
  '🐴': 'Animals and Nature/Horse Face.webp',
  '🐰': 'Animals and Nature/Rabbit Face.webp',
  '🐹': 'Animals and Nature/Hamster.webp',
  '🐳': 'Animals and Nature/Spouting Whale.webp',
  '🐢': 'Animals and Nature/Turtle.webp',
  '🐞': 'Animals and Nature/Lady Beetle.webp',
  '🐜': 'Animals and Nature/Ant.webp',
  '🦞': 'Animals and Nature/Lobster.webp',
  '🦒': 'Animals and Nature/Giraffe.webp',
  '🦓': 'Animals and Nature/Zebra.webp',
  '🌸': 'Animals and Nature/Cherry Blossom.webp',
  '🌹': 'Animals and Nature/Rose.webp',
  '🌷': 'Animals and Nature/Tulip.webp',
  '🌴': 'Animals and Nature/Palm Tree.webp',
  '🌲': 'Animals and Nature/Evergreen Tree.webp',
  '🌵': 'Animals and Nature/Cactus.webp',
  '✨': 'Activity/Sparkles.webp',

  // === Additional Activities & Objects ===
  '🏀': 'Activity/Basketball.webp',
  '⚽': 'Activity/Soccer Ball.webp',
  '🪩': 'Activity/Mirror Ball.webp',
  '🎫': 'Activity/Ticket.webp',
  '🎃': 'Activity/Jack O Lantern.webp',
  '🥈': 'Activity/2nd Place Medal.webp',
  '🥉': 'Activity/3rd Place Medal.webp',
  '💸': 'Objects/Money With Wings.webp',
  '⌛': 'Objects/Hourglass Not Done.webp',
  '💻': 'Objects/Laptop.webp',
  '📱': 'Objects/Mobile Phone.webp',
  '📺': 'Objects/Television.webp',
  '🔭': 'Objects/Telescope.webp',
  '🔬': 'Objects/Microscope.webp',
  '🎤': 'Objects/Microphone.webp',
  '🎙': 'Objects/Studio Microphone.webp',
  '🔒': 'Objects/Locked With Key.webp',
  '🔍': 'Objects/Magnifying Glass Tilted Left.webp',
  '🔎': 'Objects/Magnifying Glass Tilted Right.webp',
  '✈': 'Travel and Places/Airplane.webp',
  '🍰': 'Food and Drink/Shortcake.webp',
  '🧁': 'Food and Drink/Cupcake.webp',
  '🍭': 'Food and Drink/Lollipop.webp',
  '🍫': 'Food and Drink/Chocolate Bar.webp',
  '🍌': 'Food and Drink/Banana.webp',
  '🍦': 'Food and Drink/Soft Ice Cream.webp',
  '🌮': 'Food and Drink/Taco.webp',
  '🍣': 'Food and Drink/Sushi.webp',
  '🌭': 'Food and Drink/Hot Dog.webp',
  '🥞': 'Food and Drink/Pancakes.webp',

  // === Hearts & Reactions ===
  '❤️': 'Symbols/Red Heart.webp',
  '🧡': 'Symbols/Orange Heart.webp',
  '💛': 'Symbols/Yellow Heart.webp',
  '💚': 'Symbols/Green Heart.webp',
  '💙': 'Symbols/Blue Heart.webp',
  '💜': 'Symbols/Purple Heart.webp',
  '🖤': 'Symbols/Black Heart.webp',
  '🤍': 'Symbols/White Heart.webp',
  '🤎': 'Symbols/Brown Heart.webp',
  '💖': 'Symbols/Sparkling Heart.webp',
  '💗': 'Symbols/Growing Heart.webp',
  '💓': 'Symbols/Beating Heart.webp',
  '❤️‍🔥': 'Symbols/Heart On Fire.webp',
  '💔': 'Symbols/Broken Heart.webp',
  '💯': 'Symbols/Hundred Points.webp',
  '💬': 'Symbols/Speech Balloon.webp',
  '💭': 'Symbols/Thought Balloon.webp',
  '💤': 'Symbols/Zzz.webp',
  '✅': 'Symbols/Check Mark Button.webp',

  // === Telegram Smileys & Reactions ===
  '😎': 'Smileys/Smiling Face With Sunglasses.webp',
  '🥳': 'Smileys/Partying Face.webp',
  '🤩': 'Smileys/Star Struck.webp',
  '🥰': 'Smileys/Smiling Face With Hearts.webp',
  '😍': 'Smileys/Smiling Face With Heart-Eyes.webp',
  '😘': 'Smileys/Face Blowing A Kiss.webp',
  '😊': 'Smileys/Smiling Face With Smiling Eyes.webp',
  '😀': 'Smileys/Grinning Face.webp',
  '😃': 'Smileys/Grinning Face With Big Eyes.webp',
  '😄': 'Smileys/Grinning Face With Smiling Eyes.webp',
  '😁': 'Smileys/Beaming Face With Smiling Eyes.webp',
  '😆': 'Smileys/Grinning Squinting Face.webp',
  '😅': 'Smileys/Grinning Face With Sweat.webp',
  '😂': 'Smileys/Face With Tears Of Joy.webp',
  '🤣': 'Smileys/Rolling On The Floor Laughing.webp',
  '😉': 'Smileys/Winking Face.webp',
  '😇': 'Smileys/Smiling Face With Halo.webp',
  '😋': 'Smileys/Face Savoring Food.webp',
  '😛': 'Smileys/Face With Tongue.webp',
  '😜': 'Smileys/Winking Face With Tongue.webp',
  '🤪': 'Smileys/Zany Face.webp',
  '😝': 'Smileys/Squinting Face With Tongue.webp',
  '🤑': 'Smileys/Money Mouth Face.webp',
  '🤗': 'Smileys/Hugging Face.webp',
  '🤭': 'Smileys/Face With Hand Over Mouth.webp',
  '🤫': 'Smileys/Shushing Face.webp',
  '🤔': 'Smileys/Thinking Face.webp',
  '🤐': 'Smileys/Zipper Mouth Face.webp',
  '🤨': 'Smileys/Face With Raised Eyebrow.webp',
  '😐': 'Smileys/Neutral Face.webp',
  '😑': 'Smileys/Expressionless Face.webp',
  '😶': 'Smileys/Face Without Mouth.webp',
  '😏': 'Smileys/Smirking Face.webp',
  '😒': 'Smileys/Unamused Face.webp',
  '🙄': 'Smileys/Face With Rolling Eyes.webp',
  '😬': 'Smileys/Grimacing Face.webp',
  '🤥': 'Smileys/Lying Face.webp',
  '😌': 'Smileys/Relieved Face.webp',
  '😔': 'Smileys/Pensive Face.webp',
  '😪': 'Smileys/Sleepy Face.webp',
  '🤤': 'Smileys/Drooling Face.webp',
  '😴': 'Smileys/Sleeping Face.webp',
  '😷': 'Smileys/Face With Medical Mask.webp',
  '🤒': 'Smileys/Face With Thermometer.webp',
  '🤕': 'Smileys/Face With Head Bandage.webp',
  '🤢': 'Smileys/Nauseated Face.webp',
  '🤮': 'Smileys/Face Vomiting.webp',
  '🤧': 'Smileys/Sneezing Face.webp',
  '🥵': 'Smileys/Hot Face.webp',
  '🥶': 'Smileys/Cold Face.webp',
  '🥴': 'Smileys/Woozy Face.webp',
  '😵': 'Smileys/Dizzy Face.webp',
  '🤯': 'Smileys/Exploding Head.webp',
  '🤠': 'Smileys/Cowboy Hat Face.webp',
  '🥸': 'Smileys/Disguised Face.webp',
  '🤓': 'Smileys/Nerd Face.webp',
  '🧐': 'Smileys/Face With Monocle.webp',
  '😕': 'Smileys/Confused Face.webp',
  '😟': 'Smileys/Worried Face.webp',
  '🙁': 'Smileys/Slightly Frowning Face.webp',
  '☹️': 'Smileys/Frowning Face.webp',
  '☹': 'Smileys/Frowning Face.webp',
  '😮': 'Smileys/Face With Open Mouth.webp',
  '😯': 'Smileys/Hushed Face.webp',
  '😲': 'Smileys/Astonished Face.webp',
  '😳': 'Smileys/Flushed Face.webp',
  '🥺': 'Smileys/Pleading Face.webp',
  '😦': 'Smileys/Frowning Face With Open Mouth.webp',
  '😧': 'Smileys/Anguished Face.webp',
  '😨': 'Smileys/Fearful Face.webp',
  '😰': 'Smileys/Anxious Face With Sweat.webp',
  '😥': 'Smileys/Sad But Relieved Face.webp',
  '😢': 'Smileys/Crying Face.webp',
  '😭': 'Smileys/Loudly Crying Face.webp',
  '😱': 'Smileys/Face Screaming In Fear.webp',
  '😖': 'Smileys/Confounded Face.webp',
  '😣': 'Smileys/Persevering Face.webp',
  '😞': 'Smileys/Disappointed Face.webp',
  '😓': 'Smileys/Downcast Face With Sweat.webp',
  '😩': 'Smileys/Weary Face.webp',
  '😫': 'Smileys/Tired Face.webp',
  '🥱': 'Smileys/Yawning Face.webp',
  '😤': 'Smileys/Face With Steam From Nose.webp',
  '😡': 'Smileys/Angry Face.webp',
  '😠': 'Smileys/Angry Face.webp',
  '🤬': 'Smileys/Face With Symbols On Mouth.webp',
  '😈': 'Smileys/Smiling Face With Horns.webp',
  '👿': 'Smileys/Angry Face With Horns.webp',
  '💀': 'Smileys/Skull.webp',
  '☠️': 'Smileys/Skull And Crossbones.webp',
  '☠': 'Smileys/Skull And Crossbones.webp',
  '💩': 'Smileys/Pile Of Poo.webp',
  '🤡': 'Smileys/Clown Face.webp',
  '👹': 'Smileys/Ogre.webp',
  '👺': 'Smileys/Goblin.webp',
  Ghost: 'Smileys/Ghost.webp',
  '👻': 'Smileys/Ghost.webp',
  '👽': 'Smileys/Alien.webp',
  '👾': 'Smileys/Alien Monster.webp',
  '🤖': 'Smileys/Robot.webp',
  '😺': 'Smileys/Grinning Cat.webp',
  '😸': 'Smileys/Grinning Cat With Smiling Eyes.webp',
  '😹': 'Smileys/Cat With Tears Of Joy.webp',
  '😻': 'Smileys/Smiling Cat With Heart Eyes.webp',
  '😼': 'Smileys/Cat With Wry Smile.webp',
  '😽': 'Smileys/Kissing Cat.webp',
  '🙀': 'Smileys/Weary Cat.webp',
  '😿': 'Smileys/Crying Cat.webp',
  '😾': 'Smileys/Pouting Cat.webp',
  '🫡': 'Smileys/Saluting Face.webp',
  '🙈': 'Smileys/See No Evil Monkey.webp',
  '🙉': 'Smileys/Hear No Evil Monkey.webp',
  '🙊': 'Smileys/Speak No Evil Monkey.webp',

  // === Seamless Fallback Aliases for Legacy SAS Emojis ===
  '🎁': 'Activity/Party Popper.webp',
  '📷': 'Objects/Television.webp',
  '⏰': 'Objects/Hourglass Done.webp',
  '🎸': 'Objects/Musical Notes.webp',
  '🛡': 'Objects/Locked With Key.webp',
  '🎯': 'Activity/1st Place Medal.webp',
  '🍎': 'Food and Drink/Strawberry.webp',
  '🪐': 'Travel and Places/Rocket.webp',
  '🌊': 'Animals and Nature/Spouting Whale.webp',
  '🐬': 'Animals and Nature/Spouting Whale.webp',
  '🦅': 'Animals and Nature/Parrot.webp',
  '⚓': 'Travel and Places/Compass.webp',
  '🍉': 'Food and Drink/Strawberry.webp',
  '🍒': 'Food and Drink/Strawberry.webp',
  '🥑': 'Food and Drink/Banana.webp',
  '🏔': 'Animals and Nature/Snowflake.webp',
  '🏖': 'Animals and Nature/Sun.webp',
  '🏝': 'Animals and Nature/Palm Tree.webp',
  '⛵': 'Travel and Places/Airplane.webp',
  '🛸': 'Travel and Places/Rocket.webp',
  '🔔': 'Objects/Crown.webp',
  '🎧': 'Objects/Musical Notes.webp',
  '🧩': 'Activity/Video Game.webp',

  // === Soundboard Specific High-Energy Emojis ===
  '📢': 'Objects/Megaphone.webp',
  '🗿': 'Travel and Places/Moai.webp',
  '🪙': 'Objects/Coin.webp',
  '🆙': 'Symbols/Up Button.webp',
  '🌀': 'Symbols/Dizzy.webp',
  '🦗': 'Animals and Nature/Cricket.webp',
  '💥': 'Symbols/Collision.webp',
  '❌': 'Symbols/Cross Mark.webp',
  '🔊': 'Objects/Megaphone.webp',
  '🥁': 'Objects/Musical Notes.webp',
  '🎺': 'Objects/Musical Notes.webp',
  '🛡️': 'Objects/Military Helmet.webp',
  '⚔️': 'Objects/Military Helmet.webp',
  '⚔': 'Objects/Military Helmet.webp',
  '🤷': 'People/Person Shrugging.webp',
  '🤷‍♂️': 'People/Man Shrugging.webp',
  '🤷‍♀️': 'People/Woman Shrugging.webp',
  '🤦‍♀️': 'People/Woman Facepalming.webp',
  '🥹': 'Smileys/Face Holding Back Tears.webp',
  '🤌': 'People/Pinched Fingers.webp',
  '🌚': 'Animals and Nature/New Moon Face.webp',
  '🍾': 'Food and Drink/Bottle With Popping Cork.webp',
  '💋': 'Symbols/Kiss Mark.webp',
  '🖕': 'People/Middle Finger.webp',
  '👩‍💻': 'People/Woman Technologist.webp',
  '👀': 'People/Eyes.webp',
  '✍️': 'People/Writing Hand.webp',
  '✍': 'People/Writing Hand.webp',
  '🎅': 'People/Santa Claus.webp',
  '🎄': 'Activity/Christmas Tree.webp',
  '☃️': 'Animals and Nature/Snowman.webp',
  '☃': 'Animals and Nature/Snowman.webp',
  '💅': 'People/Nail Polish.webp',
  '🆒': 'Symbols/Cool Button.webp',
  '🌝': 'Animals and Nature/Sun With Face.webp',
  '💊': 'Objects/Pill.webp',
  '🎇': 'Activity/Sparkler.webp',
  '☕': 'Food and Drink/Hot Beverage.webp',
  '🍺': 'Food and Drink/Clinking Glasses.webp',
  '🍻': 'Food and Drink/Clinking Glasses.webp',
};

/**
 * Converts a unicode emoji character to a unified hex string
 * used by Apple emoji asset CDNs (e.g. '🦋' -> '1f98b', '❤️' -> '2764-fe0f').
 */
export function emojiToUnified(emoji: string): string {
  if (!emoji) return '';
  return Array.from(emoji.trim())
    .map((c) => c.codePointAt(0)?.toString(16) || '')
    .filter(Boolean)
    .join('-');
}

/**
 * Splits text into text and emoji segments for rendering Apple / Telegram emojis.
 */
export function parseEmojiSegments(text: string): { type: 'text' | 'emoji'; content: string }[] {
  if (!text) return [];
  const segments: { type: 'text' | 'emoji'; content: string }[] = [];
  const emojiRegex = /^\p{Extended_Pictographic}$/u;

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    for (const { segment } of segmenter.segment(text)) {
      const clean = segment.replace(/[\uFE0E\uFE0F]/g, '');
      const parts = clean.split('\u200D');
      const isEmoji = parts.every((p) => emojiRegex.test(p.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')));
      if (isEmoji) {
        segments.push({ type: 'emoji', content: segment });
      } else {
        const last = segments[segments.length - 1];
        if (last && last.type === 'text') {
          last.content += segment;
        } else {
          segments.push({ type: 'text', content: segment });
        }
      }
    }
    return segments;
  }

  const regex =
    /(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)/gu;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'emoji', content: match[0] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return segments;
}

/**
 * Detects whether a string contains only emojis (1 to maxCount, default 3),
 * properly handling Unicode variation selectors (\uFE0F, \uFE0E), ZWJ sequences (\u200D),
 * and skin tone modifiers.
 */
export function isOnlyEmojis(text?: string | null, maxCount = 3): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const segments = Array.from(segmenter.segment(trimmed))
      .map((s) => s.segment)
      .filter((s) => s.trim().length > 0);
    if (segments.length === 0 || segments.length > maxCount) return false;
    const emojiRegex = /^\p{Extended_Pictographic}$/u;
    return segments.every((seg) => {
      const clean = seg.replace(/[\uFE0E\uFE0F]/g, '');
      const parts = clean.split('\u200D');
      return parts.every((part) => emojiRegex.test(part.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '')));
    });
  }

  const regex =
    /^(\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*|\s){1,3}$/u;
  return regex.test(trimmed);
}

/**
 * Returns the verified 60 FPS Telegram Animated WebP URL for the given emoji,
 * or null if no animated version exists in the pack.
 */
export function getTelegramAnimatedUrl(emoji: string): string | null {
  if (!emoji) return null;
  const clean = emoji.trim();
  const withoutVs = clean.replace(/\uFE0F/g, '');
  const path = TELEGRAM_ANIMATED_EMOJI_MAP[clean] || TELEGRAM_ANIMATED_EMOJI_MAP[withoutVs];
  if (path) {
    return `${TELEGRAM_ANIMATED_CDN}/${encodeURI(path)}`;
  }
  return null;
}

/**
 * Parses a string of SAS emojis (e.g. '🦋 📷 🎁 🔮' or '🦋📷🎁🔮') into an array of 4 emoji strings.
 */
export function parseEmojiList(emojiString: string): string[] {
  if (!emojiString) return [];
  const trimmed = emojiString.trim();
  const splitSpaces = trimmed.split(/\s+/).filter(Boolean);
  if (splitSpaces.length >= 2) {
    return splitSpaces;
  }

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(trimmed), (s) => s.segment).filter(Boolean);
  }

  return Array.from(trimmed);
}

export interface TelegramAppleEmojiProps {
  emoji: string;
  size?: number;
  playAnimation?: boolean;
  playOnce?: boolean;
  durationMs?: number;
  isAnimating?: boolean;
  delayMs?: number;
  variant?: 'header' | 'modal';
  className?: string;
  onClick?: () => void;
}

/**
 * Telegram Animated Emoji Component (60 FPS Native WebP)
 *
 * Renders authentic, high-definition 60 FPS animated WebP Telegram emojis
 * from Tarikul-Islam-Anik/Telegram-Animated-Emojis.
 * When playAnimation is false (or after playOnce duration finishes), renders the frozen Apple high-res PNG.
 * Automatically falls back to Apple high-res PNG and native Unicode if needed.
 */
// Global in-memory cache of captured 512x512 frozen frames (data URLs)
// so each unique animated emoji is only snapshot once across the entire application lifecycle.
const frozenFrameCache = new Map<string, string>();

/**
 * Captures a pixel-perfect 512x512 snapshot of an animated WebP
 * so when animation stops, it remains at the exact resting frame with zero blur and zero animation loop.
 */
function captureFrameFromElement(imgEl: HTMLImageElement | null): string | null {
  if (!imgEl) return null;
  try {
    if (!imgEl.complete || imgEl.naturalWidth === 0) return null;
    const canvas = document.createElement('canvas');
    const width = Math.max(imgEl.naturalWidth, 512);
    const height = Math.max(imgEl.naturalHeight, 512);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(imgEl, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

function TelegramAppleEmojiComponent({
  emoji,
  size = 24,
  playAnimation = true,
  playOnce = false,
  durationMs = 2400,
  isAnimating = false,
  delayMs = 0,
  variant = 'header',
  className = '',
  onClick,
}: TelegramAppleEmojiProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [hasAnimatedError, setHasAnimatedError] = useState(false);
  const [hasFallbackError, setHasFallbackError] = useState(false);
  const [use64pxFallback, setUse64pxFallback] = useState(false);
  const [isSelfPopping, setIsSelfPopping] = useState(false);
  const [hasFinishedOnce, setHasFinishedOnce] = useState(!playOnce);

  // 1. Try 60 FPS Telegram Animated WebP
  const animatedUrl = useMemo(() => {
    return getTelegramAnimatedUrl(emoji);
  }, [emoji]);

  const [frozenFrame, setFrozenFrame] = useState<string | null>(() => {
    return animatedUrl && frozenFrameCache.has(animatedUrl)
      ? frozenFrameCache.get(animatedUrl)!
      : null;
  });

  // Attempt to capture frame on load if not already in cache (only needed when freezing)
  const handleImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      if ((!playAnimation || playOnce) && animatedUrl && !frozenFrameCache.has(animatedUrl)) {
        const snap = captureFrameFromElement(e.currentTarget);
        if (snap) {
          frozenFrameCache.set(animatedUrl, snap);
          setFrozenFrame(snap);
        }
      }
    },
    [animatedUrl, playAnimation, playOnce],
  );

  // Play once on mount/entry, then freeze at static Telegram frame
  useEffect(() => {
    if (!playOnce) return;
    setHasFinishedOnce(false);
    const timer = setTimeout(() => {
      if (animatedUrl && imgRef.current) {
        const snap = captureFrameFromElement(imgRef.current);
        if (snap) {
          frozenFrameCache.set(animatedUrl, snap);
          setFrozenFrame(snap);
        }
      }
      setHasFinishedOnce(true);
    }, durationMs);
    return () => clearTimeout(timer);
  }, [emoji, playOnce, durationMs, animatedUrl]);

  // Preload animated WebP and pre-capture frame 0 when freezing
  useEffect(() => {
    if ((!playAnimation || playOnce) && animatedUrl && typeof window !== 'undefined') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = animatedUrl;
      img.onload = () => {
        if (!frozenFrameCache.has(animatedUrl)) {
          const snap = captureFrameFromElement(img);
          if (snap) {
            frozenFrameCache.set(animatedUrl, snap);
            setFrozenFrame(snap);
          }
        }
      };
    }
  }, [animatedUrl, playAnimation, playOnce]);

  // 2. High-res Apple 160px PNG fallback (and 64px secondary fallback)
  const fallbackUrl = useMemo(() => {
    const unified = emojiToUnified(emoji);
    if (!unified) return '';
    return use64pxFallback
      ? `${APPLE_PNG_FALLBACK_CDN}/${unified}.png`
      : `${APPLE_PNG_CDN}/${unified}.png`;
  }, [emoji, use64pxFallback]);

  const activeAnimation = isAnimating || isSelfPopping;
  const animClass = activeAnimation
    ? variant === 'modal'
      ? 'telegram-emoji-bounce-modal'
      : 'telegram-emoji-bounce'
    : '';

  const handlePointerDown = useCallback(() => {
    setIsSelfPopping(true);
    setTimeout(() => setIsSelfPopping(false), 850);
    if (playOnce) {
      setHasFinishedOnce(false);
      setTimeout(() => {
        if (animatedUrl && imgRef.current) {
          const snap = captureFrameFromElement(imgRef.current);
          if (snap) {
            frozenFrameCache.set(animatedUrl, snap);
            setFrozenFrame(snap);
          }
        }
        setHasFinishedOnce(true);
      }, durationMs);
    }
    onClick?.();
  }, [playOnce, durationMs, animatedUrl, onClick]);

  // When playOnce is enabled and timer expired, motion stops completely and freezes at resting frame.
  const effectivePlayAnimation = playAnimation && (!playOnce || !hasFinishedOnce);

  const activeSrc = effectivePlayAnimation
    ? !hasAnimatedError && animatedUrl
      ? animatedUrl
      : fallbackUrl
    : (animatedUrl && (frozenFrame || frozenFrameCache.get(animatedUrl))) || fallbackUrl;

  const isUsingFallback = !effectivePlayAnimation
    ? !frozenFrame && !frozenFrameCache.get(animatedUrl || '')
    : hasAnimatedError || !animatedUrl;

  // Unicode text fallback if both CDNs fail
  if (!activeSrc || (isUsingFallback && hasFallbackError)) {
    return (
      <span
        role="img"
        aria-label={emoji}
        onPointerDown={handlePointerDown}
        style={{
          fontSize: `${size * 0.9}px`,
          lineHeight: 1,
          animationDelay: `${delayMs}ms`,
        }}
        className={`inline-flex items-center justify-center select-none ${
          activeAnimation ? 'will-change-transform' : ''
        } transition-transform hover:scale-115 active:scale-95 ${animClass} ${className}`}
      >
        {emoji}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={emoji}
      onPointerDown={handlePointerDown}
      style={{
        width: size,
        height: size,
        animationDelay: `${delayMs}ms`,
      }}
      className={`inline-flex items-center justify-center shrink-0 ${
        activeAnimation ? 'will-change-transform' : ''
      } transition-transform duration-200 hover:scale-110 active:scale-95 cursor-pointer ${animClass} ${className}`}
    >
      <span className="sr-only select-none pointer-events-none" aria-hidden="true">
        {emoji}
      </span>
      <img
        ref={imgRef}
        crossOrigin="anonymous"
        key={effectivePlayAnimation ? 'animated' : 'static'}
        src={activeSrc}
        alt={emoji}
        width={size}
        height={size}
        loading={effectivePlayAnimation ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        onLoad={handleImageLoad}
        onError={() => {
          if (effectivePlayAnimation && !hasAnimatedError && animatedUrl) {
            setHasAnimatedError(true);
          } else if (!use64pxFallback) {
            setUse64pxFallback(true);
          } else {
            setHasFallbackError(true);
          }
        }}
        className="w-full h-full object-contain pointer-events-none transform-gpu"
      />
    </span>
  );
}

export const TelegramAppleEmoji = React.memo(TelegramAppleEmojiComponent);

export interface TelegramEmojiRowProps {
  emojiString: string;
  size?: number;
  variant?: 'header' | 'modal';
  intervalSeconds?: number;
  gapClass?: string;
  className?: string;
}

/**
 * Renders a row of 4 60 FPS Telegram Animated Emojis that play their
 * natural rich character animations, accompanied by a subtle staggered organic
 * wave pulse at specified intervals (every 30s in call header, 5s in modal) or on hover.
 */
export function TelegramEmojiRow({
  emojiString,
  size = 24,
  variant = 'header',
  intervalSeconds = 30,
  gapClass = 'gap-1 sm:gap-1.5',
  className = '',
}: TelegramEmojiRowProps) {
  const emojis = parseEmojiList(emojiString);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Initial playful pulse wave after 1.2s on mount
    const initialTimer = setTimeout(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1200);
    }, 1200);

    const intervalMs = Math.max(2, intervalSeconds) * 1000;
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1200);
    }, intervalMs);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [intervalSeconds]);

  const triggerAnimation = useCallback(() => {
    if (!isAnimating) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1200);
    }
  }, [isAnimating]);

  if (emojis.length === 0) return null;

  return (
    <div
      onMouseEnter={triggerAnimation}
      className={`flex items-center justify-center ${gapClass} ${className}`}
    >
      {emojis.map((emoji, index) => (
        <TelegramAppleEmoji
          key={`${emoji}-${index}`}
          emoji={emoji}
          size={size}
          variant={variant}
          isAnimating={isAnimating}
          delayMs={index * 110}
        />
      ))}
    </div>
  );
}

export default TelegramAppleEmoji;
