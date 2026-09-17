export interface CookieSubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface CookieSection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr: string;
  subsections: CookieSubsection[];
}

export interface CookiePolicyTranslation {
  hero: {
    archivedLink: string;
    title: string;
    effectiveDate: string;
    lastUpdated: string;
    description: string;
  };
  toc: {
    contents: string;
    readProgress: string;
    print: string;
    backToTop: string;
  };
  sections: CookieSection[];
}

export const COOKIE_POLICY_DATA: Record<'en' | 'uk', CookiePolicyTranslation> = {
  en: {
    hero: {
      archivedLink: 'Archived Versions',
      title: 'COOKIE POLICY',
      effectiveDate: 'Effective: April 15, 2024 • Latest update: September 1, 2026',
      lastUpdated: 'Last Updated: March 15, 2024',
      description:
        'We may receive information from cookies (small text files placed on your computer or device) and similar technologies. First-party cookies are placed by us (and our third-party service providers) and allow you to use the services and help us analyze and improve your experience and the services. You can control cookies as described in the “How to control your privacy” section of Eternal’s Privacy Policy.',
    },
    toc: {
      contents: 'Table of Contents',
      readProgress: '% read',
      print: 'Print Policy',
      backToTop: 'Back to top',
    },
    sections: [
      {
        id: 'types-of-cookies',
        number: '1',
        title: 'Types of Cookies We Use',
        iconName: 'Cookie',
        tldr: 'We use Strictly Necessary, Functional, and Performance/Analytics cookies to authenticate accounts, remember settings, and optimize platform speed.',
        subsections: [
          {
            id: 'cookie-categories',
            title: '1.1 Cookie Categories',
            content: [
              'The Eternal services use the following categories of cookies and local storage tokens:',
            ],
            bullets: [
              'Strictly Necessary Cookies: These are essential for our services to function securely, maintain session state, authenticate users, and meet our legal obligations. If you try to disable these cookies through browser tools, parts of Eternal will not work properly.',
              'Functional Cookies: These help us provide enhanced and personalized functionality on the services, such as remembering your language preferences, theme settings (Dark/Light mode), and audio device selections.',
              'Performance & Analytics Cookies: These allow us or our third-party analytics providers to learn how you and others interact with and navigate the services, enabling us to diagnose latency, monitor server load, and continuously improve platform performance.',
            ],
          },
        ],
      },
      {
        id: 'manage-cookies',
        number: '2',
        title: 'How to Manage Cookies',
        iconName: 'Settings',
        tldr: 'You can manage or disable cookies via browser settings, mobile operating system toggles, third-party analytics opt-outs, or our on-site Cookie Settings.',
        subsections: [
          {
            id: 'management-options',
            title: '2.1 Browser and Device Controls',
            content: [
              'To control how information is collected and used from cookies on Eternal, you can take one or more of the following steps:',
            ],
            bullets: [
              'Browser Settings: You can disable, restrict, or clear cookies through your browser settings. You will need to configure these preferences individually for each browser and device you use (Chrome, Firefox, Safari, Edge, Opera).',
              'Analytics Opt-Out: To disable performance analytics cookies, you can use browser controls or specific opt-out tools such as the Google Analytics Opt-Out browser add-on.',
              'Mobile Device Settings: Your mobile operating system (iOS or Android) includes system-level controls to manage web cookies, reset advertising identifiers, and limit app data sharing.',
              'Industry Opt-Out Portals: You can learn more about limiting interest-based tracking through the Network Advertising Initiative (NAI), Digital Advertising Alliance (DAA), or European Interactive Digital Advertising Alliance (EDAA for EU/EEA users).',
              'Website Cookie Settings: You can adjust your cookie preferences at any time by selecting “Cookie Settings” in the footer of our website or within your account privacy settings.',
            ],
          },
          {
            id: 'impact-of-disabling',
            title: '2.2 Impact of Disabling Cookies',
            content: [
              'If you disable or remove cookies, please note that some essential features and dynamic real-time communication tools on Eternal may not function properly. In addition, an opt-out cookie may be set in your browser solely to remember your preference.',
            ],
          },
        ],
      },
      {
        id: 'contact-and-dpo',
        number: '3',
        title: 'Questions and Contact Information',
        iconName: 'Mail',
        tldr: 'For any questions regarding our Cookie Policy or privacy practices, reach out to our team in Kyiv, Ukraine or email our Data Protection Officer.',
        subsections: [
          {
            id: 'contact-details',
            title: '3.1 Direct Inquiries',
            content: [
              'If you have questions, feedback, or concerns about this Cookie Policy or how Eternal uses tracking technologies, please contact us at:',
            ],
            bullets: [
              'Privacy & Legal Operations: privacy@eternal.app',
              'Data Protection Officer: dpo@eternal.app',
              'Headquarters: Eternal Inc., Kyiv, Ukraine',
            ],
          },
        ],
      },
    ],
  },
  uk: {
    hero: {
      archivedLink: 'Архівні версії',
      title: 'ПОЛІТИКА ВИКОРИСТАННЯ ФАЙЛІВ COOKIE',
      effectiveDate:
        'Дата набрання чинності: 15 квітня 2024 р. • Останнє оновлення: 1 вересня 2026 р.',
      lastUpdated: 'Останнє оновлення: 15 березня 2024 р.',
      description:
        'Ми можемо отримувати інформацію з файлів cookie (невеликих текстових файлів, які зберігаються на вашому пристрої) та схожих технологій. Основні файли cookie встановлюються нами (та нашими сервісними провайдерами), дозволяють користуватися сервісом та допомагають аналізувати й покращувати роботу Eternal.',
    },
    toc: {
      contents: 'Зміст політики',
      readProgress: '% прочитано',
      print: 'Друк документа',
      backToTop: 'Нагору',
    },
    sections: [
      {
        id: 'types-of-cookies',
        number: '1',
        title: 'Типи файлів Cookie, які ми використовуємо',
        iconName: 'Cookie',
        tldr: 'Ми використовуємо обов’язкові, функціональні та аналітичні файли cookie для безпечного входу, збереження налаштувань та оптимізації швидкості сервісу.',
        subsections: [
          {
            id: 'cookie-categories',
            title: '1.1 Категорії файлів Cookie',
            content: [
              'Платформа Eternal використовує такі категорії файлів cookie та локальних сховищ:',
            ],
            bullets: [
              'Обов’язкові (Strictly Necessary): необхідні для безпечної роботи сервісу, автентифікації користувача, захисту від шахрайства та виконання юридичних вимог. У разі їх блокування сервіс не зможе функціонувати належним чином.',
              'Функціональні (Functional): допомагають зберігати ваші персоналізовані налаштування (мова інтерфейсу, темна/світла тема, вибрані аудіопристрої).',
              'Продуктивність та аналітика (Performance & Analytics): дозволяють нам та провайдерам аналітики розуміти, як користувачі взаємодіють із платформою, виявляти технічні збої та оптимізувати роботу серверів.',
            ],
          },
        ],
      },
      {
        id: 'manage-cookies',
        number: '2',
        title: 'Як керувати файлами Cookie',
        iconName: 'Settings',
        tldr: 'Ви можете налаштувати або вимкнути файли cookie через налаштування браузера, мобільного пристрою або розділ «Налаштування cookie» на нашому сайті.',
        subsections: [
          {
            id: 'management-options',
            title: '2.1 Способи керування',
            content: [
              'Щоб контролювати збір та використання даних через файли cookie, ви можете скористатися такими засобами:',
            ],
            bullets: [
              'Налаштування браузера: ви можете вимкнути або очистити cookie у своєму браузері (Chrome, Firefox, Safari, Edge, Opera) індивідуально для кожного пристрою.',
              'Відмова від аналітики: для блокування аналітичних cookie можна використати спеціальні інструменти відмови (наприклад, Google Analytics Opt-Out).',
              'Параметри мобільного пристрою: iOS та Android мають системні налаштування конфіденційності та обмеження відстеження.',
              'Галузеві платформи: ви можете обмежити персоналізовану рекламу через NAI, DAA або EDAA (для користувачів у країнах ЄС/ЄЕЗ).',
              'Налаштування на сайті: ви можете будь-коли змінити параметри cookie через пункт «Налаштування cookie» у футері Eternal.',
            ],
          },
          {
            id: 'impact-of-disabling',
            title: '2.2 Наслідки вимкнення Cookie',
            content: [
              'Зверніть увагу: вимкнення обов’язкових або функціональних файлів cookie може призвести до некоректної роботи деяких інтерактивних функцій та голосових каналів Eternal.',
            ],
          },
        ],
      },
      {
        id: 'contact-and-dpo',
        number: '3',
        title: 'Запитання та контакти',
        iconName: 'Mail',
        tldr: 'Якщо у вас виникли запитання щодо використання файлів cookie, зв’яжіться з нашою командою в м. Київ, Україна або надішліть листа DPO.',
        subsections: [
          {
            id: 'contact-details',
            title: '3.1 Контактні дані',
            content: [
              'З усіх запитань щодо Політики використання файлів cookie звертайтеся до нашої команди:',
            ],
            bullets: [
              'Юридичний відділ: privacy@eternal.app',
              'Офіцер із захисту даних (DPO): dpo@eternal.app',
              'Головний офіс: Eternal Inc., м. Київ, Україна',
            ],
          },
        ],
      },
    ],
  },
};
