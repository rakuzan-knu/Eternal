export interface ColorSwatch {
  id: string;
  name: string;
  hex: string;
  rgb: string;
  description: string;
  bgClass: string;
  textClass: string;
  borderClass?: string;
}

export interface BrandingTranslations {
  heroTag: string;
  heroTitle: string;
  heroSubtitle: string;
  viewBrandKit: string;
  downloadAllZip: string;
  logoHeading: string;
  logoSubtitle: string;
  downloadSvg: string;
  downloadPng: string;
  symbolHeading: string;
  symbolSubtitle: string;
  symbolNoBgLabel: string;
  symbolRoundedLabel: string;
  clearspaceHeading: string;
  clearspaceSubtitle: string;
  clearspaceLabel1: string;
  clearspaceLabel2: string;
  colorsHeading: string;
  colorsSubtitle: string;
  colorCopied: string;
  swatches: ColorSwatch[];
  legalHeading: string;
  legalIntro: string;
  dosTitle: string;
  dosItems: string[];
  dontsTitle: string;
  dontsItems: string[];
  termsLinkText: string;
  guidelinesLinkText: string;
  needMoreTitle: string;
  needMoreSubtitle: string;
}

export const BRANDING_TRANSLATIONS: Record<string, BrandingTranslations> = {
  English: {
    heroTag: 'BRAND ASSETS',
    heroTitle: 'BRAND ASSETS',
    heroSubtitle: 'Make sure to get our good side.',
    viewBrandKit: 'View Brand Kit',
    downloadAllZip: 'Download All Assets',
    logoHeading: 'OUR LOGO',
    logoSubtitle: 'Feel free to use our logo in color, black or white.',
    downloadSvg: 'Download SVG',
    downloadPng: 'Download PNG',
    symbolHeading: 'SYMBOL',
    symbolSubtitle:
      'Use these only when the Eternal brand is clearly visible or has been well established elsewhere.',
    symbolNoBgLabel: 'Symbol (Without Background)',
    symbolRoundedLabel: 'App Icon (With Rounded Background)',
    clearspaceHeading: 'CLEARSPACE',
    clearspaceSubtitle:
      'Please do not edit, change, distort, recolor, or reconfigure the Eternal logo.',
    clearspaceLabel1: '1/2 "E" safe margin on all sides',
    clearspaceLabel2: '1/3 icon width minimum padding',
    colorsHeading: 'COLORS',
    colorsSubtitle: 'Purple looks good in every season.',
    colorCopied: 'Copied HEX to clipboard!',
    swatches: [
      {
        id: 'purple',
        name: 'Eternal Purple',
        hex: '#5822B4',
        rgb: 'rgb(88, 34, 180)',
        description: 'Primary brand identity & action color',
        bgClass: 'bg-[#5822b4]',
        textClass: 'text-white',
      },
      {
        id: 'light-purple',
        name: 'Light Purple Glow',
        hex: '#A855F7',
        rgb: 'rgb(168, 85, 247)',
        description: 'Secondary neon accent & highlights',
        bgClass: 'bg-[#a855f7]',
        textClass: 'text-black',
      },
      {
        id: 'messenger-void',
        name: 'Messenger Void',
        hex: '#07050F',
        rgb: 'rgb(7, 5, 15)',
        description: 'Dark canvas background & deep glass foundation',
        bgClass: 'bg-[#07050f]',
        textClass: 'text-white',
        borderClass: 'border border-white/10',
      },
      {
        id: 'black',
        name: 'Pure Black',
        hex: '#000000',
        rgb: 'rgb(0, 0, 0)',
        description: 'Contrast text and high-definition elements',
        bgClass: 'bg-[#000000]',
        textClass: 'text-white',
        borderClass: 'border border-white/10',
      },
    ],
    legalHeading: 'LEGAL BRAND GUIDELINES',
    legalIntro:
      'ETERNAL, the “E” Logo and any other trademark owned by Eternal and its affiliates (the “Eternal Marks”) and other brand materials such as logos, trade dress, the Eternal look and feel, and other aesthetic features unique to the brand (the “Brand Assets”) are the exclusive property of Eternal Inc. You must have permission from Eternal before using any of the Eternal Marks or Brand Assets except as permitted here.',
    dosTitle: 'Do’s',
    dosItems: [
      'Always follow these Brand Guidelines when using the Eternal Marks and Brand Assets.',
      'Use the Eternal Marks to inform people that you are an Eternal user and/or that you have an Eternal community or profile, but such use must comply with these Brand Guidelines and cannot imply that you are Eternal, or somehow sponsored by or acting on behalf of Eternal.',
      'Use the Eternal Marks properly to direct users: Eternal is an adjective you can use to describe your community, voice lounge, or username on the Eternal platform.',
      'Use the Eternal Marks and Brand Assets only on digital assets (i.e. in a digital-only capacity).',
    ],
    dontsTitle: 'Don’ts',
    dontsItems: [
      'Incorporate the Eternal Marks or any mark that is confusingly similar to the Eternal Marks into the name of an Eternal community, or your brand, company or organization name, URL or domain name, event, product name (including any bots developed for the Eternal platform), logo, social media account, or trademark.',
      'Adopt any trademarks, trade dress, logos, domain names or other features that are confusingly similar to the Eternal Marks or Brand Assets.',
      'Market any product, service, or brand under a trademark, trade dress, logo, or other feature that is confusingly similar to the Eternal Marks or Brand Assets.',
      'Copy or imitate the look and feel of the Eternal website, desktop app or mobile app or Eternal marketing, including, but not limited to, characters, color combinations, graphics, sounds, imagery, presence icons, typefaces, or stylization used by Eternal (or anything similar thereto).',
      'Use the Eternal Marks and Brand Assets in a manner that is inconsistent with',
      'Use the Eternal Marks or Brand Assets on merchandise.',
    ],
    termsLinkText: "Eternal's Terms of Service",
    guidelinesLinkText: 'Community Guidelines',
    needMoreTitle: 'NEED MORE?',
    needMoreSubtitle:
      'But wait, there’s more! Download the full creative toolkit for access to all of our brand assets.',
  },
  Українська: {
    heroTag: 'МАТЕРІАЛИ БРЕНДУ',
    heroTitle: 'МАТЕРІАЛИ БРЕНДУ',
    heroSubtitle: 'Переконайтеся, що використовуєте наш найкращий ракурс.',
    viewBrandKit: 'Переглянути Brand Kit',
    downloadAllZip: 'Завантажити всі матеріали',
    logoHeading: 'НАШ ЛОГОТИП',
    logoSubtitle: 'Використовуйте наш логотип у фірмовому кольорі, чорному або білому.',
    downloadSvg: 'Завантажити SVG',
    downloadPng: 'Завантажити PNG',
    symbolHeading: 'СИМВОЛ',
    symbolSubtitle:
      'Використовуйте символ лише тоді, коли бренд Eternal уже чітко представлений або добре відомий.',
    symbolNoBgLabel: 'Символ (Без фону)',
    symbolRoundedLabel: 'Іконка додатка (З заокругленим фоном)',
    clearspaceHeading: 'ОХОРОННА ЗОНА (CLEARSPACE)',
    clearspaceSubtitle:
      'Будь ласка, не змінюйте пропорції, не спотворюйте та не перефарбовуйте логотип Eternal.',
    clearspaceLabel1: 'Безпечний відступ у 1/2 "E" з усіх боків',
    clearspaceLabel2: 'Мінімальний відступ 1/3 ширини іконки',
    colorsHeading: 'ФІРМОВІ КОЛЬОРИ',
    colorsSubtitle: 'Фіолетовий виглядає чудово будь-якої пори року.',
    colorCopied: 'HEX скопійовано в буфер обміну!',
    swatches: [
      {
        id: 'purple',
        name: 'Eternal Purple',
        hex: '#5822B4',
        rgb: 'rgb(88, 34, 180)',
        description: 'Основний фірмовий колір бренду та акцентів',
        bgClass: 'bg-[#5822b4]',
        textClass: 'text-white',
      },
      {
        id: 'light-purple',
        name: 'Light Purple Glow',
        hex: '#A855F7',
        rgb: 'rgb(168, 85, 247)',
        description: 'Неоновий акцент та підсвічування',
        bgClass: 'bg-[#a855f7]',
        textClass: 'text-black',
      },
      {
        id: 'messenger-void',
        name: 'Messenger Void',
        hex: '#07050F',
        rgb: 'rgb(7, 5, 15)',
        description: 'Темне полотно месенджера та основа темного скла',
        bgClass: 'bg-[#07050f]',
        textClass: 'text-white',
        borderClass: 'border border-white/10',
      },
      {
        id: 'black',
        name: 'Pure Black',
        hex: '#000000',
        rgb: 'rgb(0, 0, 0)',
        description: 'Контрастний чорний для друку та чітких елементів',
        bgClass: 'bg-[#000000]',
        textClass: 'text-white',
        borderClass: 'border border-white/10',
      },
    ],
    legalHeading: 'ПРАВИЛА ВИКОРИСТАННЯ БРЕНДУ',
    legalIntro:
      'ETERNAL, логотип «E» та будь-які інші торгові марки, що належать Eternal та її партнерам («Знаки Eternal»), а також інші матеріали бренду, такі як логотипи, фірмовий стиль, зовнішній вигляд Eternal та інші унікальні естетичні особливості бренду («Матеріали бренду»), є виключною власністю Eternal. Ви повинні отримати дозвіл від Eternal перед використанням будь-яких Знаків Eternal або Матеріалів бренду, за винятком випадків, дозволених тут.',
    dosTitle: 'Що дозволено (Do’s)',
    dosItems: [
      'Завжди дотримуйтесь цих Правил використання бренду під час застосування Знаків і Матеріалів бренду Eternal.',
      'Використовуйте знаки Eternal, щоб повідомити користувачам, що ви є користувачем Eternal або що у вас є спільнота/профіль у мережі, проте таке використання не повинно створювати враження, що ви дієте від імені або за підтримки Eternal.',
      'Використовуйте назву Eternal належним чином: Eternal — це назва для опису вашої кімнати, каналу чи профілю на платформі Eternal.',
      'Використовуйте матеріали бренду виключно в цифровому форматі.',
    ],
    dontsTitle: 'Що заборонено (Don’ts)',
    dontsItems: [
      'Включати знаки Eternal або схожі на них позначення до назв сторонніх додатків, сайтів, торгових марок чи доменних імен.',
      'Використовувати логотипи чи елементи дизайну, які можна сплутати з офіційними матеріалами Eternal.',
      'Рекламувати будь-які сторонні комерційні товари під виглядом офіційних продуктів Eternal.',
      'Копіювати зовнішній вигляд, розташування елементів інтерфейсу, фірмових персонажів чи колірну гаму платформи Eternal.',
      'Використовувати бренд Eternal у спосіб, що суперечить',
      'Використовувати знаки бренду на фізичному мерчі без письмового дозволу.',
    ],
    termsLinkText: 'Умовам використання Eternal',
    guidelinesLinkText: 'Правилам спільноти',
    needMoreTitle: 'ПОТРІБНО БІЛЬШЕ?',
    needMoreSubtitle:
      'Але це ще не все! Завантажуйте повний набір матеріалів для доступу до всіх фірмових ресурсів нашого бренду.',
  },
  Deutsch: {
    heroTag: 'MARKEN-ASSETS',
    heroTitle: 'MARKEN-ASSETS',
    heroSubtitle: 'Nutzen Sie unsere offiziellen Markenressourcen.',
    viewBrandKit: 'Brand Kit ansehen',
    downloadAllZip: 'Alle Assets herunterladen',
    logoHeading: 'UNSER LOGO',
    logoSubtitle: 'Nutzen Sie unser Logo in Farbe, Schwarz oder Weiß.',
    downloadSvg: 'SVG herunterladen',
    downloadPng: 'PNG herunterladen',
    symbolHeading: 'SYMBOL',
    symbolSubtitle: 'Verwenden Sie das Symbol nur bei bereits bekannter Marke.',
    symbolNoBgLabel: 'Symbol (Ohne Hintergrund)',
    symbolRoundedLabel: 'App-Icon (Mit abgerundetem Hintergrund)',
    clearspaceHeading: 'SCHUTZZONE',
    clearspaceSubtitle: 'Bitte verändern Sie das Logo nicht.',
    clearspaceLabel1: '1/2 "E" Sicherheitsabstand',
    clearspaceLabel2: '1/3 Mindestabstand',
    colorsHeading: 'FARBEN',
    colorsSubtitle: 'Violett passt zu jeder Jahreszeit.',
    colorCopied: 'HEX kopiert!',
    swatches: [
      {
        id: 'purple',
        name: 'Eternal Purple',
        hex: '#5822B4',
        rgb: 'rgb(88, 34, 180)',
        description: 'Hauptmarkenfarbe',
        bgClass: 'bg-[#5822b4]',
        textClass: 'text-white',
      },
      {
        id: 'messenger-void',
        name: 'Messenger Void',
        hex: '#07050F',
        rgb: 'rgb(7, 5, 15)',
        description: 'Dunkler UI-Hintergrund',
        bgClass: 'bg-[#07050f]',
        textClass: 'text-white',
        borderClass: 'border border-white/10',
      },
      {
        id: 'black',
        name: 'Pure Black',
        hex: '#000000',
        rgb: 'rgb(0, 0, 0)',
        description: 'Reines Schwarz',
        bgClass: 'bg-[#000000]',
        textClass: 'text-white',
        borderClass: 'border border-white/10',
      },
    ],
    legalHeading: 'MARKENRICHTLINIEN',
    legalIntro: 'Die Marken von Eternal sind geschütztes Eigentum.',
    dosTitle: 'Erlaubt (Do’s)',
    dosItems: ['Verwenden Sie die Marken nur gemäß den Richtlinien.'],
    dontsTitle: 'Nicht erlaubt (Don’ts)',
    dontsItems: ['Verändern Sie die Logos nicht.', 'Verstoß gegen die'],
    termsLinkText: 'Nutzungsbedingungen',
    guidelinesLinkText: 'Community-Richtlinien',
    needMoreTitle: 'MEHR BENÖTIGT?',
    needMoreSubtitle: 'Laden Sie das komplette Kreativ-Toolkit herunter.',
  },
  Español: {
    heroTag: 'RECURSOS DE MARCA',
    heroTitle: 'RECURSOS DE MARCA',
    heroSubtitle: 'Asegúrate de mostrar nuestro mejor lado.',
    viewBrandKit: 'Ver Brand Kit',
    downloadAllZip: 'Descargar todo',
    logoHeading: 'NUESTRO LOGOTIPO',
    logoSubtitle: 'Utiliza nuestro logotipo en color, blanco o negro.',
    downloadSvg: 'Descargar SVG',
    downloadPng: 'Descargar PNG',
    symbolHeading: 'SÍMBOLO',
    symbolSubtitle: 'Úsalo cuando la marca sea claramente identificable.',
    symbolNoBgLabel: 'Símbolo (Sin fondo)',
    symbolRoundedLabel: 'Icono de App (Con fondo redondeado)',
    clearspaceHeading: 'ESPACIO PROTEGIDO',
    clearspaceSubtitle: 'Por favor, no distorsiones ni cambies el logotipo.',
    clearspaceLabel1: '1/2 "E" margen de seguridad',
    clearspaceLabel2: '1/3 margen mínimo',
    colorsHeading: 'COLORES',
    colorsSubtitle: 'El morado se ve bien en cualquier ocasión.',
    colorCopied: '¡HEX copiado!',
    swatches: [
      {
        id: 'purple',
        name: 'Eternal Purple',
        hex: '#5822B4',
        rgb: 'rgb(88, 34, 180)',
        description: 'Color primario de marca',
        bgClass: 'bg-[#5822b4]',
        textClass: 'text-white',
      },
      {
        id: 'messenger-void',
        name: 'Messenger Void',
        hex: '#07050F',
        rgb: 'rgb(7, 5, 15)',
        description: 'Fondo oscuro principal',
        bgClass: 'bg-[#07050f]',
        textClass: 'text-white',
        borderClass: 'border border-white/10',
      },
      {
        id: 'black',
        name: 'Pure Black',
        hex: '#000000',
        rgb: 'rgb(0, 0, 0)',
        description: 'Negro puro',
        bgClass: 'bg-[#000000]',
        textClass: 'text-white',
        borderClass: 'border border-white/10',
      },
    ],
    legalHeading: 'DIRECTRICES DE MARCA',
    legalIntro: 'Las marcas de Eternal son propiedad exclusiva.',
    dosTitle: 'Permitido (Do’s)',
    dosItems: ['Siga siempre estas directrices al usar los recursos.'],
    dontsTitle: 'Prohibido (Don’ts)',
    dontsItems: ['No imite el diseño de la plataforma.', 'No infrinja los'],
    termsLinkText: 'Términos de servicio',
    guidelinesLinkText: 'Normas de la comunidad',
    needMoreTitle: '¿NECESITAS MÁS?',
    needMoreSubtitle: 'Descarga el kit creativo completo de Eternal.',
  },
  Français: {
    heroTag: 'RESSOURCES DE MARQUE',
    heroTitle: 'RESSOURCES DE MARQUE',
    heroSubtitle: 'Montrez notre meilleur profil.',
    viewBrandKit: 'Voir le Brand Kit',
    downloadAllZip: 'Tout télécharger',
    logoHeading: 'NOTRE LOGO',
    logoSubtitle: 'Utilisez notre logo en couleur, noir ou blanc.',
    downloadSvg: 'Télécharger SVG',
    downloadPng: 'Télécharger PNG',
    symbolHeading: 'SYMBOLE',
    symbolSubtitle: 'À utiliser lorsque la marque est clairement établie.',
    symbolNoBgLabel: 'Symbole (Sans fond)',
    symbolRoundedLabel: 'Icône d’application (Avec fond arrondi)',
    clearspaceHeading: 'ZONE D’EXCLUSION',
    clearspaceSubtitle: 'Merci de ne pas modifier le logo.',
    clearspaceLabel1: '1/2 "E" marge de sécurité',
    clearspaceLabel2: '1/3 marge minimum',
    colorsHeading: 'COULEURS',
    colorsSubtitle: 'Le violet est élégant en toute saison.',
    colorCopied: 'HEX copié !',
    swatches: [
      {
        id: 'purple',
        name: 'Eternal Purple',
        hex: '#5822B4',
        rgb: 'rgb(88, 34, 180)',
        description: 'Couleur principale de marque',
        bgClass: 'bg-[#5822b4]',
        textClass: 'text-white',
      },
      {
        id: 'messenger-void',
        name: 'Messenger Void',
        hex: '#07050F',
        rgb: 'rgb(7, 5, 15)',
        description: 'Fond sombre d’interface',
        bgClass: 'bg-[#07050f]',
        textClass: 'text-white',
        borderClass: 'border border-white/10',
      },
      {
        id: 'black',
        name: 'Pure Black',
        hex: '#000000',
        rgb: 'rgb(0, 0, 0)',
        description: 'Noir pur',
        bgClass: 'bg-[#000000]',
        textClass: 'text-white',
        borderClass: 'border border-white/10',
      },
    ],
    legalHeading: 'DIRECTIVES DE MARQUE',
    legalIntro: 'Les marques et logos d’Eternal sont protégés.',
    dosTitle: 'À faire (Do’s)',
    dosItems: ['Respectez toujours ces directives.'],
    dontsTitle: 'À ne pas faire (Don’ts)',
    dontsItems: ['Ne modifiez pas les logos.', 'Ne violez pas les'],
    termsLinkText: 'Conditions d’utilisation',
    guidelinesLinkText: 'Règles de la communauté',
    needMoreTitle: 'BESOIN DE PLUS ?',
    needMoreSubtitle: 'Téléchargez le kit complet de nos ressources de marque.',
  },
};

/**
 * Downloads a clean vector SVG string directly into the user's browser with transparent background
 */
export const downloadSvgFile = (svgContent: string, filename: string) => {
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * SVG generators for all logo formats
 */
export const LOGO_SVGS = {
  // 1. Full Logo With Text (White)
  fullWhite: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80" fill="none">
    <rect width="56" height="56" x="12" y="12" rx="18" fill="url(#grad_white)" />
    <defs>
      <linearGradient id="grad_white" x1="12" y1="12" x2="68" y2="68" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#e2e8f0"/>
      </linearGradient>
    </defs>
    <text x="40" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" text-anchor="middle" fill="#07050f">E</text>
    <text x="86" y="52" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="900" letter-spacing="-1px" fill="#ffffff">Eternal</text>
  </svg>`,

  // 2. Full Logo With Text (Black)
  fullBlack: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80" fill="none">
    <rect width="56" height="56" x="12" y="12" rx="18" fill="#000000" />
    <text x="40" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" text-anchor="middle" fill="#ffffff">E</text>
    <text x="86" y="52" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="900" letter-spacing="-1px" fill="#000000">Eternal</text>
  </svg>`,

  // 3. Full Logo With Text (Brand Purple)
  fullPurple: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80" fill="none">
    <defs>
      <linearGradient id="grad_purple" x1="12" y1="12" x2="68" y2="68" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#6366f1"/>
        <stop offset="50%" stop-color="#8b5cf6"/>
        <stop offset="100%" stop-color="#ec4899"/>
      </linearGradient>
    </defs>
    <rect width="56" height="56" x="12" y="12" rx="18" fill="url(#grad_purple)" />
    <text x="40" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="34" font-weight="900" text-anchor="middle" fill="#ffffff">E</text>
    <text x="86" y="52" font-family="system-ui, -apple-system, sans-serif" font-size="38" font-weight="900" letter-spacing="-1px" fill="#a855f7">Eternal</text>
  </svg>`,

  // 4. Standalone Symbol E (No background - White)
  symbolNoBgWhite: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none">
    <text x="50" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="80" font-weight="900" text-anchor="middle" fill="#ffffff">E</text>
  </svg>`,

  // 5. Standalone Symbol E (No background - Black)
  symbolNoBgBlack: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none">
    <text x="50" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="80" font-weight="900" text-anchor="middle" fill="#000000">E</text>
  </svg>`,

  // 6. Standalone Symbol E (No background - Purple)
  symbolNoBgPurple: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none">
    <text x="50" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="80" font-weight="900" text-anchor="middle" fill="#8b5cf6">E</text>
  </svg>`,

  // 7. Rounded App Icon (Dark with White E)
  iconRoundedDark: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" fill="none">
    <rect width="112" height="112" x="4" y="4" rx="34" fill="#120f24" stroke="#8b5cf6" stroke-width="4" />
    <text x="60" y="86" font-family="system-ui, -apple-system, sans-serif" font-size="76" font-weight="900" text-anchor="middle" fill="#ffffff">E</text>
  </svg>`,

  // 8. Rounded App Icon (White with Black E)
  iconRoundedWhite: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" fill="none">
    <rect width="112" height="112" x="4" y="4" rx="34" fill="#ffffff" />
    <text x="60" y="86" font-family="system-ui, -apple-system, sans-serif" font-size="76" font-weight="900" text-anchor="middle" fill="#000000">E</text>
  </svg>`,

  // 9. Rounded App Icon (Signature Gradient with White E - Navbar 1:1)
  iconRoundedPurple: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" fill="none">
    <defs>
      <linearGradient id="app_icon_grad" x1="4" y1="4" x2="116" y2="116" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#6366f1"/>
        <stop offset="50%" stop-color="#8b5cf6"/>
        <stop offset="100%" stop-color="#ec4899"/>
      </linearGradient>
    </defs>
    <rect width="112" height="112" x="4" y="4" rx="34" fill="url(#app_icon_grad)" />
    <text x="60" y="86" font-family="system-ui, -apple-system, sans-serif" font-size="76" font-weight="900" text-anchor="middle" fill="#ffffff">E</text>
  </svg>`,
};
