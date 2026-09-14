export interface JobOpening {
  id: string;
  title: string;
  tag: string;
  department: string;
  location: string;
  type: string;
  targetAudience: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
}

export interface EarlyTeamPerk {
  id: string;
  title: string;
  desc: string;
  badge: string;
  iconType: 'stack' | 'portfolio' | 'perks' | 'schedule' | 'growth' | 'culture';
}

export interface FunClub {
  id: string;
  title: string;
  icon: string;
  grad: string;
  tag: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface CareersTranslations {
  heroTag: string;
  heroTitle: string;
  heroSubtitle: string;
  seeAllJobs: string;
  galleryTitle: string;
  gallerySubtitle: string;
  futureHeading: string;
  futureSubtitle: string;
  feature1Title: string;
  feature1Desc: string;
  feature2Title: string;
  feature2Desc: string;
  allJobsHeading: string;
  allJobsSubtitle: string;
  allDepartments: string;
  departments: { id: string; label: string }[];
  jobs: JobOpening[];
  experienceHeading: string;
  experienceSubtitle: string;
  perks: EarlyTeamPerk[];
  funHeading: string;
  funSubtitle: string;
  funClubs: FunClub[];
  faqHeading: string;
  faqSubtitle: string;
  faqItems: FAQItem[];
  faqSeeAll: string;
  applyModalTitle: string;
  applyModalSubtitle: string;
  targetAudienceLabel: string;
  tasksLabel: string;
  requirementsLabel: string;
  benefitsLabel: string;
  applyButton: string;
  applyFormName: string;
  applyFormEmail: string;
  applyFormPortfolio: string;
  applyFormAbout: string;
  applyFormSubmit: string;
  applySuccessTitle: string;
  applySuccessDesc: string;
  closeModal: string;
}

const COMMON_BENEFITS_EN = [
  'Real Production Experience: Direct hands-on work with our complex real-world stack (WebRTC, real-time WebSockets, OAuth 2.0, and distributed data systems).',
  'Strong Portfolio & References: Public authorship credit in acknowledgements, verified GitHub commits, concrete resume metrics, and personalized recommendation letters from our founders.',
  'Core Team & Future Perks: First priority for transition to full-time paid roles, equity shares, and premium platform perks when we raise seed investment or start monetization.',
  'Flexible Student Schedule: 100% remote-first asynchronous format with flexible hours that easily fit university classes, lectures, and exams.',
];

const COMMON_BENEFITS_UK = [
  'Реальний Продакшн Досвід: Робота зі складним стеком (WebRTC, WebSockets, OAuth 2.0, розподілені бази даних).',
  'Сильне Портфоліо та Рекомендації: Публічне авторство фічей, підтверджені кейси для резюме та рекомендаційні листи від засновників.',
  'Команда Ядра та Майбутні Перспективи: Пріоритет при переході на оплачуваний формат / частку при залученні перших інвестицій чи монетизації.',
  'Гнучкий Графік для Студентів: Повністю віддалений формат і вільний графік, сумісний з парами та сесіями в університеті.',
];

export const JOBS_EN: JobOpening[] = [
  {
    id: 'appsec-contributor',
    title: 'Application Security (AppSec) Contributor',
    tag: 'Security',
    department: 'Security & Infrastructure',
    location: 'Kyiv, Ukraine or Remote',
    type: 'Contributor / Internship',
    targetAudience:
      'Cybersecurity students and web application security enthusiasts looking for real pentesting practice.',
    responsibilities: [
      'Perform vulnerability assessments and pentesting on the web client and backend API',
      'Audit WebSocket channels and REST routes for potential data leaks or injection vulnerabilities',
      'Review OAuth 2.0 security workflows (Spotify, SoundCloud, Discord integration tokens)',
      'Harden client-side defenses against XSS, CSRF, and brute-force attempts',
    ],
    requirements: [
      'Basic understanding of OWASP Top 10 for modern single-page applications',
      'Familiarity with browser DevTools, curl, or tools like Burp Suite / OWASP ZAP',
      'Strong interest in securing real-time WebSockets and token authentication',
    ],
    benefits: COMMON_BENEFITS_EN,
  },
  {
    id: 'webrtc-audio-intern',
    title: 'WebRTC & Audio Systems Intern',
    tag: 'Engineering',
    department: 'Security & Infrastructure',
    location: 'Kyiv, Ukraine or Remote',
    type: 'Internship / Contributor',
    targetAudience:
      'Students and developers interested in low-latency networking, media streaming, and audio protocols.',
    responsibilities: [
      'Tune and optimize live voice room connections and synchronized music listening rooms',
      'Work with STUN/TURN servers and WebRTC peer connection states',
      'Experiment with Web Audio API for waveform rendering, audio filters, and latency reduction',
      'Verify real-time audio synchronization across different browser environments',
    ],
    requirements: [
      'Basic familiarity with JavaScript / TypeScript',
      'Curiosity about WebSockets, WebRTC, or Web Audio API',
      'Desire to learn real-time multimedia streaming engineering',
    ],
    benefits: COMMON_BENEFITS_EN,
  },
  {
    id: 'qa-engineer-lead',
    title: 'QA Engineer / Beta Testing Lead',
    tag: 'Quality Assurance',
    department: 'Quality Assurance & Testing',
    location: 'Remote',
    type: 'Contributor / Beta Lead',
    targetAudience:
      'Junior QA engineers and detail-oriented testers who want a verified production case study in their portfolio.',
    responsibilities: [
      'Write clear, reproducible test cases for hybrid features (post feed, direct chats, voice lounges, audio player)',
      'Identify and report state synchronization edge cases between active browser tabs',
      'Stress-test WebSocket stability under rapid messaging and real-time interaction flows',
      'Organize and categorize community bug reports for the engineering team',
    ],
    requirements: [
      'Attention to detail and a passion for polished, seamless user experience',
      'Ability to write structured step-by-step bug reports with expected vs. actual results',
      'Basic knowledge of browser DevTools console and network tabs',
    ],
    benefits: COMMON_BENEFITS_EN,
  },
  {
    id: 'automation-qa',
    title: 'Automation QA (Cypress / Playwright)',
    tag: 'Engineering',
    department: 'Quality Assurance & Testing',
    location: 'Remote',
    type: 'Contributor / Intern',
    targetAudience:
      'Students and developers wanting to build automated end-to-end (E2E) testing suites.',
    responsibilities: [
      'Develop automated E2E tests for core user journeys: signup, login, post creation, and comments',
      'Automate verification of real-time messaging, audio note recording, and reactions',
      'Integrate test suites into GitHub Actions CI pipeline',
    ],
    requirements: [
      'Basic knowledge of JavaScript or TypeScript',
      'Interest in test automation frameworks (Cypress, Playwright, or Vitest)',
      'Understanding of HTML DOM elements and selectors',
    ],
    benefits: COMMON_BENEFITS_EN,
  },
  {
    id: 'ui-ux-motion-designer',
    title: 'UI/UX & Motion Designer',
    tag: 'Design',
    department: 'Design & Creative',
    location: 'Remote',
    type: 'Contributor / Creative',
    targetAudience:
      'Junior UI/UX designers, 2D/3D artists, and motion enthusiasts passionate about dark modern aesthetics.',
    responsibilities: [
      'Evolve Eternal’s Dark Glassmorphism design system with neon highlights and liquid glass elements',
      'Design Discord-style 3D mascots, custom sticker packs, reaction badges, and iconography',
      'Prototype smooth micro-animations and interactive state transitions',
    ],
    requirements: [
      'Proficiency in Figma (knowledge of Blender, Spline, or After Effects is a plus)',
      'Good aesthetic taste and excitement for premium dark glass UI',
      'Portfolio link or visual concepts showcase',
    ],
    benefits: COMMON_BENEFITS_EN,
  },
  {
    id: 'brand-visual-artist',
    title: 'Brand & Visual Identity Artist',
    tag: 'Creative',
    department: 'Design & Creative',
    location: 'Remote',
    type: 'Contributor / Creative',
    targetAudience: 'Graphic artists, digital illustrators, and visual identity designers.',
    responsibilities: [
      'Create eye-catching banners for feature updates, release announcements, and social channels',
      'Design promotional graphics, community wallpapers, and branded event badges',
      'Help shape the overall visual mood and cyber-community identity of Eternal',
    ],
    requirements: [
      'Experience in Photoshop, Illustrator, or Figma',
      'Creative imagination and feeling for vibrant community branding',
    ],
    benefits: COMMON_BENEFITS_EN,
  },
  {
    id: 'community-early-access-manager',
    title: 'Community & Early Access Manager',
    tag: 'Community',
    department: 'Community & Product',
    location: 'Kyiv, Ukraine or Remote',
    type: 'Community Lead',
    targetAudience:
      'Active community leaders and organizers who love bringing people together and gathering feedback.',
    responsibilities: [
      'Engage with early beta testers, gather community impressions, and coordinate feedback with developers',
      'Host voice room parties, live music listening sessions, and community tournaments in Eternal',
      'Maintain welcoming, respectful, and lively discussion channels',
    ],
    requirements: [
      'Friendly, empathetic, and communicative personality',
      'Experience with Discord or Telegram community moderation',
      'Genuine enthusiasm for building vibrant social spaces',
    ],
    benefits: COMMON_BENEFITS_EN,
  },
  {
    id: 'open-contributor',
    title: 'Open Contributor / Wildcard Application',
    tag: 'General',
    department: 'Community & Product',
    location: 'Kyiv, Ukraine or Remote',
    type: 'Open Position',
    targetAudience:
      'Universal opening for anyone who is passionate about Eternal and wants to build something awesome together.',
    responsibilities: [
      'Got a unique idea or skill? Reach out and we will find the ideal intersection for your talents!',
      'Frontend, backend, sound design, marketing, data, or community projects — every contribution matters',
    ],
    requirements: ['Curiosity, dedication, and excitement to shape the future of social networks'],
    benefits: COMMON_BENEFITS_EN,
  },
];

export const CAREERS_JOBS: JobOpening[] = JOBS_EN;

const JOBS_UK: JobOpening[] = [
  {
    id: 'appsec-contributor',
    title: 'Application Security (AppSec) Contributor',
    tag: 'Security',
    department: 'Security & Infrastructure',
    location: 'Київ, Україна або Віддалено',
    type: 'Контриб’ютор / Стажування',
    targetAudience:
      'Студенти факультетів кібербезпеки та ентузіасти AppSec, які хочуть реальної практики пентестингу.',
    responsibilities: [
      'Пошук вразливостей (Pentesting) веб-клієнта та серверного API',
      'Аудит безпеки WebSocket-каналів та REST-маршрутів на витоки даних',
      'Перевірка захисту OAuth 2.0 (Spotify, SoundCloud, Discord токени авторизації)',
      'Захист від XSS, CSRF, WebSocket injection та брутфорс атак',
    ],
    requirements: [
      'Базове розуміння OWASP Top 10 для сучасних Single Page Applications',
      'Знайомство з браузерними DevTools, curl або інструментами Burp Suite / OWASP ZAP',
      'Інтерес до захисту real-time комунікацій та токенів авторизації',
    ],
    benefits: COMMON_BENEFITS_UK,
  },
  {
    id: 'webrtc-audio-intern',
    title: 'WebRTC & Audio Systems Intern',
    tag: 'Engineering',
    department: 'Security & Infrastructure',
    location: 'Київ, Україна або Віддалено',
    type: 'Стажування / Контриб’ютор',
    targetAudience:
      'Студенти та розробники, які цікавляться низькозатримковими мережами, медіа-стрімінгом та аудіопротоколами.',
    responsibilities: [
      'Налаштування та оптимізація голосових кімнат і кімнат для спільного прослуховування музики',
      'Робота з STUN/TURN серверами та WebRTC peer connections',
      'Експерименти з Web Audio API для відтворення звукових хвиль та мінімізації затримки',
      'Тестування синхронного аудіо на різних браузерах і пристроях',
    ],
    requirements: [
      'Базове знання JavaScript / TypeScript',
      'Допитливість щодо WebSockets, WebRTC або Web Audio API',
      'Бажання вивчати потокове аудіо/відео в реальному часі',
    ],
    benefits: COMMON_BENEFITS_UK,
  },
  {
    id: 'qa-engineer-lead',
    title: 'QA Engineer / Beta Testing Lead',
    tag: 'Quality Assurance',
    department: 'Quality Assurance & Testing',
    location: 'Віддалено',
    type: 'Контриб’ютор / Beta Lead',
    targetAudience:
      'Початківці QA та уважні тестувальники, які хочуть реальний підтверджений кейс у резюме.',
    responsibilities: [
      'Написання чітких тест-кейсів для гібридного функціоналу (стрічка, чати, голосові кімнати, плеєр)',
      'Пошук багів синхронізації стану між вкладками браузера',
      'Навантажувальне тестування стабільності сокетів при активному обміні повідомленнями',
      'Класифікація та передача баг-репортів від тестерів команді розробки',
    ],
    requirements: [
      'Уважність до деталей та прагнення до ідеального користувацького досвіду',
      'Вміння структуровано описувати кроки відтворення багів',
      'Базове розуміння консолі та вкладки Network у браузерних DevTools',
    ],
    benefits: COMMON_BENEFITS_UK,
  },
  {
    id: 'automation-qa',
    title: 'Automation QA (Cypress / Playwright)',
    tag: 'Engineering',
    department: 'Quality Assurance & Testing',
    location: 'Віддалено',
    type: 'Контриб’ютор / Стажер',
    targetAudience: 'Студенти та QA, які хочуть створювати автоматизовані скрізні (E2E) тести.',
    responsibilities: [
      'Розробка автотестів для ключових флоу: реєстрація, вхід, публікація постів та коментарів',
      'Автоматизація тестування повідомлень, аудіо-нотаток та реакцій',
      'Інтеграція запусків тестів у GitHub Actions CI',
    ],
    requirements: [
      'Базові знання JavaScript або TypeScript',
      'Інтерес до автоматизації (Cypress, Playwright або Vitest)',
      'Розуміння DOM-дерева та селекторів елементів',
    ],
    benefits: COMMON_BENEFITS_UK,
  },
  {
    id: 'ui-ux-motion-designer',
    title: 'UI/UX & Motion Designer',
    tag: 'Design',
    department: 'Design & Creative',
    location: 'Віддалено',
    type: 'Контриб’ютор / Дизайнер',
    targetAudience:
      'UI/UX дизайнери, 2D/3D художники та моушн-дизайнери, які люблять естетику темного скла.',
    responsibilities: [
      'Розвиток дизайн-системи Eternal (Dark Glassmorphism, неонові акценти, рідке скло)',
      'Створення 3D маскотів у стилі Discord, стікерів, реакцій та іконок',
      'Прототипування плавних мікро-анімацій та інтерактивних станів',
    ],
    requirements: [
      'Впевнене володіння Figma (знання Blender, Spline чи After Effects буде плюсом)',
      'Гарний естетичний смак та любов до темних інтерфейсів',
      'Посилання на портфоліо чи концептуальні роботи',
    ],
    benefits: COMMON_BENEFITS_UK,
  },
  {
    id: 'brand-visual-artist',
    title: 'Brand & Visual Identity Artist',
    tag: 'Creative',
    department: 'Design & Creative',
    location: 'Віддалено',
    type: 'Контриб’ютор / Художник',
    targetAudience: 'Цифрові художники, ілюстратори та дизайнери промо-графіки.',
    responsibilities: [
      'Створення яскравих банерів для оновлень, релізів та соціальних мереж проєкту',
      'Дизайн промо-матеріалів, шпалер для комьюніті та бейджів подій',
      'Формування візуальної атмосфери та айдентики Eternal',
    ],
    requirements: [
      'Досвід роботи у Photoshop, Illustrator або Figma',
      'Творче бачення та відчуття сучасного бренд-стилю',
    ],
    benefits: COMMON_BENEFITS_UK,
  },
  {
    id: 'community-early-access-manager',
    title: 'Community & Early Access Manager',
    tag: 'Community',
    department: 'Community & Product',
    location: 'Київ, Україна або Віддалено',
    type: 'Лідер спільноти',
    targetAudience:
      'Активні організатори та модератори, які вміють об’єднувати людей та збирати відгуки.',
    responsibilities: [
      'Спілкування з ранніми тестерами, збір вражень та передача побажань розробникам',
      'Організація івентів у голосових кімнатах, вечорів музики та турнірів',
      'Підтримка дружньої та затишної атмосфери на серверах спільноти',
    ],
    requirements: [
      'Дружелюбність, комунікабельність та емпатія',
      'Досвід адміністрування Discord або Telegram спільнот',
      'Щирий інтерес до розвитку соціальної мережі',
    ],
    benefits: COMMON_BENEFITS_UK,
  },
  {
    id: 'open-contributor',
    title: 'Open Contributor / Wildcard Application',
    tag: 'General',
    department: 'Community & Product',
    location: 'Київ, Україна або Віддалено',
    type: 'Вільна позиція',
    targetAudience:
      'Універсальна можливість для кожного, хто горить проєктом і хоче створювати круті речі разом.',
    responsibilities: [
      'Маєте цікаву ідею або унікальні навички? Напишіть нам, і ми знайдемо ідеальну роль!',
      'Фронтенд, бекенд, саунд-дизайн, маркетинг, аналітика чи ком’юніті — нам важливий кожен внесок',
    ],
    requirements: ['Ініціативність, ентузіазм та бажання створювати найкращий продукт'],
    benefits: COMMON_BENEFITS_UK,
  },
];

export const CAREERS_TRANSLATIONS: Record<string, CareersTranslations> = {
  English: {
    heroTag: 'WORK AT ETERNAL',
    heroTitle: 'WORK AT ETERNAL',
    heroSubtitle:
      'Our contributors and team members aren’t just the most talented folks in the industry, they’re also deeply passionate about building the future of authentic social connections, real-time audio, and modern community communication.',
    seeAllJobs: 'See All Jobs',
    galleryTitle: 'EXPLORE THE ETERNAL INTERFACE',
    gallerySubtitle:
      'Swipe through real live interfaces of our platform — from dynamic Instagram-style feeds to ultra-low latency voice rooms and custom dark glassmorphism profiles.',
    futureHeading: 'BE A PART OF THE FUTURE OF SOCIAL MEDIAS',
    futureSubtitle:
      'We believe Eternal is uniquely positioned to shape the next era of social networks. We aren’t just imagining what it may look like, we’re building Eternal every single day to be the best place to connect, talk, and share moments.',
    feature1Title: 'WORK WITH PEOPLE JUST AS PASSIONATE AS YOU',
    feature1Desc:
      'Much like the people on Eternal, our team members come from all walks of life with their own unique perspectives, but we all care about one thing: making Eternal your home for modern social connection.',
    feature2Title: 'WHERE EVERY IDEA IS HEARD AND VALUED',
    feature2Desc:
      'We don’t just build Eternal, we use it too! All of us want to help make Eternal the most vibrant and enjoyable place to connect with friends, and everyone’s input matters.',
    allJobsHeading: 'DON’T JUST IMAGINE THE FUTURE OF SOCIAL MEDIA — BUILD IT WITH US.',
    allJobsSubtitle:
      'Explore our open contributor and intern positions and see if any of our open roles would be a great fit for you.',
    allDepartments: 'All Departments',
    departments: [
      { id: 'all', label: 'All Departments' },
      { id: 'Security & Infrastructure', label: 'Security & Infrastructure' },
      { id: 'Quality Assurance & Testing', label: 'Quality Assurance & Testing' },
      { id: 'Design & Creative', label: 'Design & Creative' },
      { id: 'Community & Product', label: 'Community & Product' },
    ],
    jobs: JOBS_EN,
    experienceHeading: 'EXPERIENCE LIFE AT ETERNAL',
    experienceSubtitle:
      'We are an early-stage independent startup built by passionate creators. While roles are currently contributor and internship-based, here is the massive value, real experience, and future upside we provide to everyone on our team.',
    perks: [
      {
        id: 'stack',
        title: 'Real Production Experience',
        desc: 'Direct hands-on engineering with high-performance production tech: WebRTC mesh/SFU audio, real-time WebSockets, OAuth 2.0 security, and dark glassmorphism design systems.',
        badge: 'High-Tech Stack',
        iconType: 'stack',
      },
      {
        id: 'portfolio',
        title: 'Strong Portfolio & References',
        desc: 'Public authorship credit in acknowledgements, verified GitHub commits, concrete resume showcase metrics, and personalized recommendation letters from our founders.',
        badge: 'Verified Impact',
        iconType: 'portfolio',
      },
      {
        id: 'perks',
        title: 'Core Team & Future Perks',
        desc: 'First priority for transition into full-time paid engineering/design roles, equity options, and founder perks as soon as we secure early investment or launch monetization.',
        badge: 'Long-term Upside',
        iconType: 'perks',
      },
      {
        id: 'schedule',
        title: 'Flexible Student Schedule',
        desc: '100% remote-first asynchronous work. Self-paced schedule that easily integrates with your university lectures, exam sessions, and personal hobbies.',
        badge: '100% Remote',
        iconType: 'schedule',
      },
      {
        id: 'growth',
        title: 'Grow Together & Mentorship',
        desc: 'Direct collaboration with architects Nikolaj, Mihal, and Ilya. Regular engineering deep-dives, code reviews, and structured feedback to accelerate your career.',
        badge: 'Direct Mentorship',
        iconType: 'growth',
      },
      {
        id: 'culture',
        title: 'Vibrant & Warm Community',
        desc: 'An ego-free, friendly atmosphere. We hang out in voice lounges, listen to music together, play games, and build a social network we love using every day.',
        badge: 'Builder Culture',
        iconType: 'culture',
      },
    ],
    funHeading: 'WHEN IT’S TIME FOR FUN, FIND YOUR PARTY HERE',
    funSubtitle:
      'Working and contributing to Eternal is like hanging out in your favorite room; our contributors hang out and play games together, share music, and build inclusive spaces where everyone can mentor and learn.',
    funClubs: [
      {
        id: 'devs',
        title: 'Devs & Hackers',
        icon: '💻',
        grad: 'from-blue-600 to-cyan-500',
        tag: 'Architecture & Labs',
      },
      {
        id: 'music',
        title: 'Sound & Music Lounge',
        icon: '🎧',
        grad: 'from-purple-600 to-pink-500',
        tag: 'Live Sync',
      },
      {
        id: 'gaming',
        title: 'Gaming & Esports',
        icon: '🎮',
        grad: 'from-green-600 to-emerald-400',
        tag: 'Tournaments',
      },
      {
        id: 'anime',
        title: 'Anime & Manga Guild',
        icon: '🐰',
        grad: 'from-pink-500 to-rose-400',
        tag: 'Community',
      },
      {
        id: 'art',
        title: '3D Art & UI Studio',
        icon: '🎨',
        grad: 'from-indigo-600 to-purple-500',
        tag: 'Design',
      },
      {
        id: 'study',
        title: 'Night Owls & Study',
        icon: '🌙',
        grad: 'from-violet-600 to-indigo-700',
        tag: 'Focus Room',
      },
    ],
    faqHeading: 'QUESTIONS?',
    faqSubtitle:
      'Questions about our contributor and internship process? Check out our frequently asked questions.',
    faqItems: [
      {
        question:
          'How does the early contributor and internship format work without direct salary?',
        answer:
          'We are an early-stage startup building our core product from Kyiv, Ukraine. Roles are currently contributor/internship-based without direct cash salary, but we provide immense value: real-world production experience on advanced WebRTC/WebSocket stacks, public authorship credit, personalized letters of recommendation, and first priority for paid roles/equity once funding is secured.',
      },
      {
        question: 'Do I have to live in Kyiv, or can I contribute remotely from anywhere?',
        answer:
          'You can contribute from anywhere in the world! While our founding team is in Kyiv, our workflow is 100% remote and asynchronous.',
      },
      {
        question:
          'How many hours per week are expected, and is it compatible with university studies?',
        answer:
          'We are extremely student-friendly and flexible. Most contributors spend anywhere from 5 to 15 hours per week at their own pace, and you can freely pause during university exams or busy weeks.',
      },
      {
        question: 'Can I apply if I am a beginner or junior developer/designer?',
        answer:
          'Absolutely! We love passionate individuals with curiosity and dedication. If you want to learn modern tools and solve real problems, our core team will mentor and support you.',
      },
      {
        question: 'I submitted an application, when will I hear back from the founders?',
        answer:
          'Our founders review every application personally within 2–3 business days. We will contact you via Telegram or Email for a casual, friendly chat.',
      },
      {
        question: 'Can I propose my own feature or join via Open Contributor?',
        answer:
          'Yes! We love open initiatives. If you have an exciting idea for audio features, mini-games, security audits, or graphics, we will gladly give you the platform and support to build it.',
      },
    ],
    faqSeeAll: 'Show More Questions',
    applyModalTitle: 'Position Details',
    applyModalSubtitle: 'Join the Eternal Core & Contributor Team',
    targetAudienceLabel: 'Who this is for',
    tasksLabel: 'Key Tasks & Responsibilities',
    requirementsLabel: 'Requirements & Skills',
    benefitsLabel: 'What We Offer',
    applyButton: 'Apply for this Role',
    applyFormName: 'Your Full Name',
    applyFormEmail: 'Email Address / Telegram',
    applyFormPortfolio: 'GitHub / Portfolio / Resume Link',
    applyFormAbout: 'Why do you want to contribute to Eternal?',
    applyFormSubmit: 'Submit Application',
    applySuccessTitle: 'Application Received! 🎉',
    applySuccessDesc:
      'Thank you for reaching out! Our team will review your application and get in touch shortly.',
    closeModal: 'Close',
  },
  Українська: {
    heroTag: 'РОБОТА В ETERNAL',
    heroTitle: 'РОБОТА В ETERNAL',
    heroSubtitle:
      'Наші контриб’ютори та учасники команди — це не просто талановиті люди, вони щиро захоплені створенням майбутнього відкритих соціальних комунікацій, аудіо в реальному часі та сучасних спільнот.',
    seeAllJobs: 'Переглянути всі вакансії',
    galleryTitle: 'ДОСЛІДЖУЙТЕ ІНТЕРФЕЙС ETERNAL',
    gallerySubtitle:
      'Переглядайте живі інтерфейси нашої платформи — від візуальної стрічки постів до надшвидких голосових кімнат та персоналізованих профілів у стилі темного скла.',
    futureHeading: 'СТАНЬ ЧАСТИНОЮ МАЙБУТНЬОГО СОЦМЕРЕЖ',
    futureSubtitle:
      'Ми віримо, що Eternal покликаний змінити уявлення про сучасні соцмережі. Ми не просто уявляємо, яким має бути спілкування — ми щодня створюємо найкраще місце для зв’язку, розмов та щирих емоцій.',
    feature1Title: 'ПРАЦЮЙТЕ З ЛЮДЬМИ, ТАК САМО ЗАХОПЛЕНИМИ СВОЄЮ СПРАВОЮ',
    feature1Desc:
      'Як і користувачі Eternal, члени нашої команди мають різний досвід та унікальні погляди, але нас об’єднує одне: прагнення зробити Eternal затишним домом для щирого спілкування.',
    feature2Title: 'ДЕ КОЖНА ІДЕЯ МАЄ ЗНАЧЕННЯ ТА ЦІНУЄТЬСЯ',
    feature2Desc:
      'Ми не просто розробляємо Eternal — ми самі користуємося ним щодня! Кожен із нас робить свій внесок, і голос кожного важливий для розвитку продукту.',
    allJobsHeading: 'НЕ ПРОСТО УЯВЛЯЙТЕ МАЙБУТНЄ СОЦМЕРЕЖ — БУДУЙТЕ ЙОГО РАЗОМ З НАМИ.',
    allJobsSubtitle:
      'Ознайомтеся з нашими відкритими вакансіями та стажуваннями і знайдіть свою ідеальну роль у проєкті.',
    allDepartments: 'Усі відділи',
    departments: [
      { id: 'all', label: 'Усі відділи' },
      { id: 'Security & Infrastructure', label: 'Безпека та Інфраструктура' },
      { id: 'Quality Assurance & Testing', label: 'Тестування та QA' },
      { id: 'Design & Creative', label: 'Дизайн та Креатив' },
      { id: 'Community & Product', label: 'Спільнота та Продукт' },
    ],
    jobs: JOBS_UK,
    experienceHeading: 'ЖИТТЯ ТА ДОСВІД В ETERNAL',
    experienceSubtitle:
      'Ми — стартап на ранній стадії, який створюють захоплені розробники. Наразі ми працюємо у форматі контриб’юторства та стажування, але ось яку колосальну цінність, реальний продакшн-досвід та майбутні перспективи ми надаємо кожному в нашій команді.',
    perks: [
      {
        id: 'stack',
        title: 'Реальний Продакшн Досвід',
        desc: 'Практична робота зі складним сучасним стеком: WebRTC аудіо-руми, синхронізація WebSockets у реальному часі, безпека OAuth 2.0 та темний дизайн-глассморфізм.',
        badge: 'Високий стек',
        iconType: 'stack',
      },
      {
        id: 'portfolio',
        title: 'Сильне Портфоліо та Рекомендації',
        desc: 'Публічне авторство створених фічей у подяках, підтверджені кейси в GitHub для резюме та персональні рекомендаційні листи від засновників.',
        badge: 'Підтверджений кейс',
        iconType: 'portfolio',
      },
      {
        id: 'perks',
        title: 'Команда Ядра та Майбутні Перспективи',
        desc: 'Першочерговий перехід на оплачувані посади, частка/опціони та преміум-бонуси платформи при залученні перших інвестицій чи старті монетизації.',
        badge: 'Перспектива зростання',
        iconType: 'perks',
      },
      {
        id: 'schedule',
        title: 'Гнучкий Графік для Студентів',
        desc: 'Повністю віддалений асинхронний формат. Вільний графік, який ідеально поєднується з парами в університеті, сесіями та особистим життям.',
        badge: '100% Remote',
        iconType: 'schedule',
      },
      {
        id: 'growth',
        title: 'Спільний Розвиток і Менторство',
        desc: 'Пряма взаємодія з архітекторами Миколою, Міхалом та Іллею. Регулярні код-рев’ю, інженерні обговорення та швидкий ріст навичок.',
        badge: 'Пряме менторство',
        iconType: 'growth',
      },
      {
        id: 'culture',
        title: 'Тепла та Відкрита Культура',
        desc: 'Дружня атмосфера без зайвої бюрократії. Спілкуємося в голосових кімнатах, слухаємо разом музику, граємо та створюємо продукт, який любимо самі.',
        badge: 'Культура авторів',
        iconType: 'culture',
      },
    ],
    funHeading: 'КОЛИ ЧАС ВІДПОЧИТИ — ЗНАХОДЬ СВОЮ КОМПАНІЮ',
    funSubtitle:
      'Робота та контриб’юторство в Eternal — це як час у затишній кімнаті з друзями: ми збираємося в голосових кімнатах, граємо разом в ігри, ділимося музикою та підтримуємо одне одного.',
    funClubs: [
      {
        id: 'devs',
        title: 'Дев & Хакер Клуб',
        icon: '💻',
        grad: 'from-blue-600 to-cyan-500',
        tag: 'Архітектура та Лаби',
      },
      {
        id: 'music',
        title: 'Музичний Лаундж',
        icon: '🎧',
        grad: 'from-purple-600 to-pink-500',
        tag: 'Live Синхрон',
      },
      {
        id: 'gaming',
        title: 'Геймінг & Кіберспорт',
        icon: '🎮',
        grad: 'from-green-600 to-emerald-400',
        tag: 'Турніри',
      },
      {
        id: 'anime',
        title: 'Аніме & Манга Гільдія',
        icon: '🐰',
        grad: 'from-pink-500 to-rose-400',
        tag: 'Спільнота',
      },
      {
        id: 'art',
        title: '3D Арт & Дизайн Студія',
        icon: '🎨',
        grad: 'from-indigo-600 to-purple-500',
        tag: 'Дизайн',
      },
      {
        id: 'study',
        title: 'Нічні Сови & Навчання',
        icon: '🌙',
        grad: 'from-violet-600 to-indigo-700',
        tag: 'Фокус-рум',
      },
    ],
    faqHeading: 'ЗАПИТАННЯ?',
    faqSubtitle:
      'Маєте запитання про формат участі та стажування в Eternal? Перегляньте найчастіші відповіді.',
    faqItems: [
      {
        question: 'Як працює формат контриб’юторства без прямої зарплати?',
        answer:
          'Ми — стартап на початковому етапі розробки ядра у Києві. Участь наразі є волонтерською/стажуванням без щомісячної зарплати, але ми даємо величезну практичну користь: реальний бойовий досвід із WebRTC/WebSockets, офіційне підтвердження авторства в резюме, рекомендаційні листи від засновників та пріоритет на оплачувані посади та частку проєкту при залученні інвестицій.',
      },
      {
        question: 'Чи обов’язково жити в Києві, чи можна долучитися віддалено з будь-якого міста?',
        answer:
          'Ви можете долучитися з будь-якого куточка України чи світу! Хоча засновники перебувають у Києві, вся комунікація та розробка побудовані на 100% віддаленому та асинхронному форматі.',
      },
      {
        question: 'Скільки годин на тиждень потрібно приділяти, і чи сумісно це з навчанням?',
        answer:
          'Ми максимально підтримуємо студентів. Більшість учасників приділяють від 5 до 15 годин на тиждень у зручний для себе час, а під час сесій чи дедлайнів в університеті можна вільно брати паузу.',
      },
      {
        question: 'Чи можна подаватися початківцям або Junior спеціалістам?',
        answer:
          'Так, звісно! Головне — це щире бажання вчитися, ініціативність та любов до продукту. Команда засновників завжди готова підказати, провести рев’ю та допомогти розібратися.',
      },
      {
        question: 'Я надіслав заявку, коли очікувати на відповідь?',
        answer:
          'Засновники особисто переглядають кожну анкету протягом 2–3 робочих днів. Ми зв’яжемося з вами у Telegram або поштою для теплої неформальної бесіди.',
      },
      {
        question: 'Чи можу я запропонувати власну ідею або фічу через Wildcard?',
        answer:
          'Безперечно! Ми відкриті до сміливих ідей. Якщо у вас є концепт нової функції, аудіо-кімнати чи покращення безпеки — ми допоможемо вам реалізувати її в Eternal.',
      },
    ],
    faqSeeAll: 'Показати більше запитань',
    applyModalTitle: 'Деталі вакансії',
    applyModalSubtitle: 'Приєднуйтесь до команди контриб’юторів Eternal',
    targetAudienceLabel: 'Для кого ця роль',
    tasksLabel: 'Основні завдання та обов’язки',
    requirementsLabel: 'Вимоги та навички',
    benefitsLabel: 'Що ми пропонуємо',
    applyButton: 'Подати заявку на вакансію',
    applyFormName: 'Ваше повне ім’я',
    applyFormEmail: 'Email / Telegram для зв’язку',
    applyFormPortfolio: 'Посилання на GitHub / Портфоліо / Резюме',
    applyFormAbout: 'Чому ви хочете приєднатися до Eternal?',
    applyFormSubmit: 'Надіслати заявку',
    applySuccessTitle: 'Заявку надіслано! 🎉',
    applySuccessDesc:
      'Дякуємо за відгук! Наша команда розгляне вашу анкету та зв’яжеться з вами найближчим часом.',
    closeModal: 'Закрити',
  },
  Deutsch: {
    heroTag: 'KARRIERE BEI ETERNAL',
    heroTitle: 'KARRIERE BEI ETERNAL',
    heroSubtitle:
      'Unsere Teammitglieder gestalten leidenschaftlich die Zukunft sozialer Netzwerke.',
    seeAllJobs: 'Alle Jobs ansehen',
    galleryTitle: 'DIE ETERNAL SCHNITTSTELLE',
    gallerySubtitle: 'Entdecken Sie die Plattform-Oberfläche.',
    futureHeading: 'WERDEN SIE TEIL DER ZUKUNFT',
    futureSubtitle: 'Gemeinsam bauen wir die beste Plattform.',
    feature1Title: 'ARBEITEN MIT LEIDENSCHAFTLICHEN MENSCHEN',
    feature1Desc: 'Wir teilen die gemeinsame Vision bester sozialer Interaktion.',
    feature2Title: 'JEDE IDEE ZÄHLT',
    feature2Desc: 'Wir nutzen Eternal jeden Tag und gestalten es gemeinsam.',
    allJobsHeading: 'GESTALTEN SIE DIE ZUKUNFT MIT UNS.',
    allJobsSubtitle: 'Finden Sie die passende Position.',
    allDepartments: 'Alle Bereiche',
    departments: [
      { id: 'all', label: 'Alle Bereiche' },
      { id: 'Security & Infrastructure', label: 'Sicherheit & Infrastruktur' },
      { id: 'Quality Assurance & Testing', label: 'Qualitätssicherung' },
      { id: 'Design & Creative', label: 'Design & Kreation' },
      { id: 'Community & Product', label: 'Community & Produkt' },
    ],
    jobs: JOBS_EN,
    experienceHeading: 'ERFAHRUNG BEI ETERNAL',
    experienceSubtitle: 'Erhalten Sie echte Praxiserfahrung in einem innovativen Startup.',
    perks: [
      {
        id: 'stack',
        title: 'Echte Produktionserfahrung',
        desc: 'Arbeiten mit WebRTC, WebSockets und OAuth 2.0.',
        badge: 'Technologie',
        iconType: 'stack',
      },
      {
        id: 'portfolio',
        title: 'Starkes Portfolio',
        desc: 'Öffentliche Nennung und Empfehlungsschreiben.',
        badge: 'Referenzen',
        iconType: 'portfolio',
      },
      {
        id: 'perks',
        title: 'Zukunftsperspektiven',
        desc: 'Priorität bei bezahlten Positionen.',
        badge: 'Chancen',
        iconType: 'perks',
      },
      {
        id: 'schedule',
        title: 'Flexibler Zeitplan',
        desc: '100% remote und anpassbar ans Studium.',
        badge: 'Remote',
        iconType: 'schedule',
      },
      {
        id: 'growth',
        title: 'Gemeinsames Wachstum',
        desc: 'Direktes Mentoring durch die Gründer.',
        badge: 'Mentoring',
        iconType: 'growth',
      },
      {
        id: 'culture',
        title: 'Offene Kultur',
        desc: 'Freundliche und motivierte Atmosphäre.',
        badge: 'Team',
        iconType: 'culture',
      },
    ],
    funHeading: 'ZEIT FÜR SPASS UND GEMEINSCHAFT',
    funSubtitle: 'Treffen Sie Gleichgesinnte in unseren thematischen Räumen.',
    funClubs: [
      {
        id: 'devs',
        title: 'Devs Club',
        icon: '💻',
        grad: 'from-blue-600 to-cyan-500',
        tag: 'Tech',
      },
      {
        id: 'music',
        title: 'Music Lounge',
        icon: '🎧',
        grad: 'from-purple-600 to-pink-500',
        tag: 'Audio',
      },
      {
        id: 'gaming',
        title: 'Gaming Squad',
        icon: '🎮',
        grad: 'from-green-600 to-emerald-400',
        tag: 'Spiele',
      },
      {
        id: 'anime',
        title: 'Anime Guild',
        icon: '🐰',
        grad: 'from-pink-500 to-rose-400',
        tag: 'Community',
      },
    ],
    faqHeading: 'FRAGEN?',
    faqSubtitle: 'Häufig gestellte Fragen zu unserem Bewerbungsprozess.',
    faqItems: [
      {
        question: 'Wie funktioniert das Mitwirken ohne direktes Gehalt?',
        answer:
          'Wir bieten wertvolle Praxiserfahrung, Portfolio-Nachweise und Vorrang bei künftigen bezahlten Stellen.',
      },
      {
        question: 'Kann ich ortsunabhängig arbeiten?',
        answer: 'Ja, unsere Arbeit ist 100% remote.',
      },
    ],
    faqSeeAll: 'Mehr Fragen',
    applyModalTitle: 'Stellendetails',
    applyModalSubtitle: 'Werden Sie Teil des Teams',
    targetAudienceLabel: 'Zielgruppe',
    tasksLabel: 'Aufgaben',
    requirementsLabel: 'Anforderungen',
    benefitsLabel: 'Was wir bieten',
    applyButton: 'Jetzt bewerben',
    applyFormName: 'Ihr Name',
    applyFormEmail: 'E-Mail-Adresse',
    applyFormPortfolio: 'GitHub / Portfolio Link',
    applyFormAbout: 'Ihre Motivation',
    applyFormSubmit: 'Bewerbung absenden',
    applySuccessTitle: 'Bewerbung erhalten! 🎉',
    applySuccessDesc: 'Wir melden uns in Kürze.',
    closeModal: 'Schließen',
  },
  Español: {
    heroTag: 'TRABAJA EN ETERNAL',
    heroTitle: 'TRABAJA EN ETERNAL',
    heroSubtitle: 'Nuestro equipo crea con pasión el futuro de las redes sociales.',
    seeAllJobs: 'Ver todas las vacantes',
    galleryTitle: 'EXPLORA LA PLATAFORMA',
    gallerySubtitle: 'Descubre las interfaces de Eternal.',
    futureHeading: 'SÉ PARTE DEL FUTURO',
    futureSubtitle: 'Construyendo el mejor espacio para conectar.',
    feature1Title: 'TRABAJA CON GENTE APASIONADA',
    feature1Desc: 'Compartimos la misma pasión por conectar personas.',
    feature2Title: 'DONDE CADA IDEA CUENTA',
    feature2Desc: 'Usamos Eternal a diario y valoramos cada aporte.',
    allJobsHeading: 'CONSTRUYE EL FUTURO CON NOSOTROS.',
    allJobsSubtitle: 'Descubre nuestras vacantes abiertas.',
    allDepartments: 'Todos los departamentos',
    departments: [
      { id: 'all', label: 'Todos los departamentos' },
      { id: 'Security & Infrastructure', label: 'Seguridad e Infraestructura' },
      { id: 'Quality Assurance & Testing', label: 'Control de Calidad (QA)' },
      { id: 'Design & Creative', label: 'Diseño y Creatividad' },
      { id: 'Community & Product', label: 'Comunidad y Producto' },
    ],
    jobs: JOBS_EN,
    experienceHeading: 'VIVE LA EXPERIENCIA EN ETERNAL',
    experienceSubtitle: 'Obtén experiencia real en producción en una startup en crecimiento.',
    perks: [
      {
        id: 'stack',
        title: 'Experiencia Real en Producción',
        desc: 'Trabajo directo con WebRTC, WebSockets y OAuth 2.0.',
        badge: 'Tecnología',
        iconType: 'stack',
      },
      {
        id: 'portfolio',
        title: 'Portafolio y Recomendaciones',
        desc: 'Créditos públicos y cartas de recomendación.',
        badge: 'Impacto',
        iconType: 'portfolio',
      },
      {
        id: 'perks',
        title: 'Equipo Principal y Futuro',
        desc: 'Prioridad para puestos remunerados en el futuro.',
        badge: 'Crecimiento',
        iconType: 'perks',
      },
      {
        id: 'schedule',
        title: 'Horario Flexible para Estudiantes',
        desc: '100% remoto y compatible con tus estudios.',
        badge: 'Remoto',
        iconType: 'schedule',
      },
      {
        id: 'growth',
        title: 'Mentoría Directa',
        desc: 'Aprende directamente de los fundadores.',
        badge: 'Mentoría',
        iconType: 'growth',
      },
      {
        id: 'culture',
        title: 'Cultura Abierta y Cálida',
        desc: 'Un ambiente amigable y sin jerarquías.',
        badge: 'Comunidad',
        iconType: 'culture',
      },
    ],
    funHeading: 'CUANDO SEA HORA DE DIVERTIRSE, ENCUENTRA TU GRUPO',
    funSubtitle: 'Únete a nuestras salas de voz y comparte con el equipo.',
    funClubs: [
      {
        id: 'devs',
        title: 'Club de Desarrolladores',
        icon: '💻',
        grad: 'from-blue-600 to-cyan-500',
        tag: 'Tech',
      },
      {
        id: 'music',
        title: 'Sala de Música',
        icon: '🎧',
        grad: 'from-purple-600 to-pink-500',
        tag: 'Audio',
      },
      {
        id: 'gaming',
        title: 'Escuadrón Gaming',
        icon: '🎮',
        grad: 'from-green-600 to-emerald-400',
        tag: 'Juegos',
      },
      {
        id: 'anime',
        title: 'Gremio Anime',
        icon: '🐰',
        grad: 'from-pink-500 to-rose-400',
        tag: 'Comunidad',
      },
    ],
    faqHeading: '¿PREGUNTAS?',
    faqSubtitle: 'Preguntas frecuentes sobre nuestro proceso.',
    faqItems: [
      {
        question: '¿Cómo funciona la colaboración en esta etapa inicial?',
        answer:
          'Brindamos experiencia práctica real, autoría pública y prioridad para puestos pagos futuros.',
      },
      {
        question: '¿Puedo colaborar de forma remota?',
        answer: 'Sí, el trabajo es 100% remoto.',
      },
    ],
    faqSeeAll: 'Ver más preguntas',
    applyModalTitle: 'Detalles de la posición',
    applyModalSubtitle: 'Únete a nuestro equipo',
    targetAudienceLabel: 'Para quién es',
    tasksLabel: 'Tareas principales',
    requirementsLabel: 'Requisitos',
    benefitsLabel: 'Lo que ofrecemos',
    applyButton: 'Postularme ahora',
    applyFormName: 'Nombre completo',
    applyFormEmail: 'Correo electrónico',
    applyFormPortfolio: 'Enlace a GitHub o Portfolio',
    applyFormAbout: '¿Por qué quieres unirte a Eternal?',
    applyFormSubmit: 'Enviar postulación',
    applySuccessTitle: '¡Postulación recibida! 🎉',
    applySuccessDesc: 'Nos pondremos en contacto contigo pronto.',
    closeModal: 'Cerrar',
  },
  Français: {
    heroTag: 'REJOINDRE ETERNAL',
    heroTitle: 'REJOINDRE ETERNAL',
    heroSubtitle: 'Notre équipe réinvente avec passion les réseaux sociaux modernes.',
    seeAllJobs: 'Voir tous les postes',
    galleryTitle: 'DÉCOUVREZ L’INTERFACE ETERNAL',
    gallerySubtitle: 'Parcourez les écrans de la plateforme.',
    futureHeading: 'FAITES PARTIE DE L’AVENIR',
    futureSubtitle: 'Bâtir le meilleur espace d’échange.',
    feature1Title: 'TRAVAILLEZ AVEC DES PASSIONNÉS',
    feature1Desc: 'Nous partageons la même passion pour l’innovation sociale.',
    feature2Title: 'OÙ CHAQUE IDÉE COMPTE',
    feature2Desc: 'Nous utilisons Eternal au quotidien.',
    allJobsHeading: 'CONSTRUISEZ LE FUTUR AVEC NOUS.',
    allJobsSubtitle: 'Explorez nos opportunités ouvertes.',
    allDepartments: 'Tous les départements',
    departments: [
      { id: 'all', label: 'Tous les départements' },
      { id: 'Security & Infrastructure', label: 'Sécurité & Infrastructure' },
      { id: 'Quality Assurance & Testing', label: 'Assurance Qualité (QA)' },
      { id: 'Design & Creative', label: 'Design & Création' },
      { id: 'Community & Product', label: 'Communauté & Produit' },
    ],
    jobs: JOBS_EN,
    experienceHeading: 'L’EXPÉRIENCE CHEZ ETERNAL',
    experienceSubtitle: 'Acquérez une expérience concrète en production.',
    perks: [
      {
        id: 'stack',
        title: 'Expérience Production Réelle',
        desc: 'Pratique directe sur WebRTC et WebSockets.',
        badge: 'Stack Moderne',
        iconType: 'stack',
      },
      {
        id: 'portfolio',
        title: 'Portfolio et Recommandations',
        desc: 'Mention publique et lettres de recommandation.',
        badge: 'Impact',
        iconType: 'portfolio',
      },
      {
        id: 'perks',
        title: 'Équipe Clé et Perspectives',
        desc: 'Priorité pour les postes rémunérés à venir.',
        badge: 'Avenir',
        iconType: 'perks',
      },
      {
        id: 'schedule',
        title: 'Horaires Flexibles pour Étudiants',
        desc: '100% à distance et adaptable.',
        badge: 'Remote',
        iconType: 'schedule',
      },
      {
        id: 'growth',
        title: 'Mentorat Direct',
        desc: 'Apprenez directement auprès des fondateurs.',
        badge: 'Mentorat',
        iconType: 'growth',
      },
      {
        id: 'culture',
        title: 'Culture Ouverte et Chaleureuse',
        desc: 'Ambiance conviviale et collaborative.',
        badge: 'Équipe',
        iconType: 'culture',
      },
    ],
    funHeading: 'QUAND VIENT L’HEURE DE S’AMUSER, REJOIGNEZ LA FÊTE',
    funSubtitle: 'Participez à nos salons thématiques et échangez avec l’équipe.',
    funClubs: [
      {
        id: 'devs',
        title: 'Club Développeurs',
        icon: '💻',
        grad: 'from-blue-600 to-cyan-500',
        tag: 'Tech',
      },
      {
        id: 'music',
        title: 'Salon Musique',
        icon: '🎧',
        grad: 'from-purple-600 to-pink-500',
        tag: 'Audio',
      },
      {
        id: 'gaming',
        title: 'Escouade Gaming',
        icon: '🎮',
        grad: 'from-green-600 to-emerald-400',
        tag: 'Jeux',
      },
      {
        id: 'anime',
        title: 'Guilde Anime',
        icon: '🐰',
        grad: 'from-pink-500 to-rose-400',
        tag: 'Communauté',
      },
    ],
    faqHeading: 'DES QUESTIONS ?',
    faqSubtitle: 'Questions fréquentes sur notre processus de recrutement.',
    faqItems: [
      {
        question: 'Comment fonctionne la contribution sans salaire direct ?',
        answer:
          'Nous offrons une expérience technique de pointe, une visibilité de portfolio et la priorité pour les futurs postes rémunérés.',
      },
      {
        question: 'Puis-je contribuer à distance ?',
        answer: 'Oui, notre collaboration est 100% à distance.',
      },
    ],
    faqSeeAll: 'Voir plus de questions',
    applyModalTitle: 'Détails du poste',
    applyModalSubtitle: 'Rejoignez notre équipe',
    targetAudienceLabel: 'Profil recherché',
    tasksLabel: 'Missions principales',
    requirementsLabel: 'Compétences requises',
    benefitsLabel: 'Ce que nous offrons',
    applyButton: 'Postuler maintenant',
    applyFormName: 'Nom complet',
    applyFormEmail: 'Adresse e-mail',
    applyFormPortfolio: 'Lien GitHub / Portfolio',
    applyFormAbout: 'Pourquoi souhaitez-vous nous rejoindre ?',
    applyFormSubmit: 'Envoyer ma candidature',
    applySuccessTitle: 'Candidature reçue ! 🎉',
    applySuccessDesc: 'Nous vous recontacterons très vite.',
    closeModal: 'Fermer',
  },
};
