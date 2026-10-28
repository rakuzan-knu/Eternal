export interface Milestone {
  date: string;
  title: string;
  description: string;
  badge: string;
}

export interface AboutPageTranslations {
  heroTag: string;
  title: string;
  subtitle: string;
  storyTitle: string;
  storySubtitle: string;
  milestones: Milestone[];
  futureHeading: string;
  futureDescription: string;
  joinButton: string;
  previewFeedUser: string;
  previewFeedLocation: string;
  previewFeedCaption: string;
  previewFeedMusic: string;
  previewChatTitle: string;
  previewChatMsg1: string;
  previewChatMsg2: string;
  previewChatTyping: string;
  previewProfileRole: string;
  previewProfileBio: string;
}

export const ABOUT_TRANSLATIONS: Record<string, AboutPageTranslations> = {
  English: {
    heroTag: 'ABOUT ETERNAL',
    title: 'ABOUT ETERNAL',
    subtitle:
      'Eternal is the next-generation social communications platform that enables you to build meaningful connections around shared passions through voice, video, rich feeds, and real-time messaging.',
    storyTitle: 'THE ETERNAL STORY',
    storySubtitle:
      'Eternal was built to solve one core problem: how to bring authentic, high-speed, and secure communication back to modern communities. Just like our favorite epic journeys, it all started with a clear vision...',
    milestones: [
      {
        date: 'June 2026',
        title: 'The Inception & Core Architecture',
        description:
          'Nikolaj Agh, Mihal Agh, and Ilya Podorozhnyi begin development of Eternal’s architecture in Kyiv, Ukraine. The goal: to create a lightning-fast social engine that combines all the features of modern applications and user needs, so that instead of having 10 different places for your friends, you can be in one place together.',
        badge: 'Genesis',
      },
      {
        date: 'July 2026',
        title: 'Real-Time Messenger & Dynamic Feed',
        description:
          'Eternal releases its rich feed of posts, stories, voice video notes, custom chat settings, and instant messaging with customizable reactions and audio formats.',
        badge: 'Platform Evolution',
      },
      {
        date: 'August 2026',
        title: 'Music Hub, Voice Rooms & Global Reach',
        description:
          'We are improving our platform, adding new features, systems, algorithms, collecting analytics, and working on this project every day.',
        badge: 'Global Ecosystem',
      },
    ],
    futureHeading: '2026 AND ON...',
    futureDescription:
      "We're continuing to make Eternal the best, most reliable and vibrant social platform for friends, creators, and communities worldwide. Perhaps some intergalactic connections along the way — who knows?",
    joinButton: 'Open Eternal',
    previewFeedUser: 'Mihal Agh',
    previewFeedLocation: 'Kyiv, Ukraine',
    previewFeedCaption: 'Golden hour moments with Eternal 🌅✨ Truly grateful for our community!',
    previewFeedMusic: 'Resonance — HOME',
    previewChatTitle: '✨ Eternal Core & Friends',
    previewChatMsg1: 'Hey everyone! The new audio notes and real-time sync are live! 🚀',
    previewChatMsg2: 'Tested on desktop and mobile — super smooth! 💜',
    previewChatTyping: 'Ilya is typing...',
    previewProfileRole: 'Co-founder & Lead Architect',
    previewProfileBio: 'Building the next era of real-time social connection at Eternal.',
  },
  Українська: {
    heroTag: 'ПРО ETERNAL',
    title: 'ПРО ETERNAL',
    subtitle:
      'Eternal — це соціальна комунікаційна платформа нового покоління, яка дозволяє будувати щирі зв’язки навколо спільних інтересів за допомогою голосу, відео, стрічки постів та миттєвого обміну повідомленнями.',
    storyTitle: 'ІСТОРІЯ ETERNAL',
    storySubtitle:
      'Eternal створювався з однією метою: повернути сучасним спільнотам справжнє, швидке та безпечне спілкування без штучних бар’єрів. Як і у кожній захоплюючій історії, усе почалося з великої ідеї...',
    milestones: [
      {
        date: 'Червень 2026',
        title: 'Зародження та Архітектура',
        description:
          'Микола Аг, Міхал Аг та Ілля Подорожний розпочинають розробку архітектури Eternal у Києві, Україна. Мета: створити блискавично швидкий соціальний движок, який поєднує всі функції сучасних додатків та потреби користувачів, щоб замість 10 різних місць для ваших друзів ви могли бути разом в одному місці.',
        badge: 'Початок шляху',
      },
      {
        date: 'Липень 2026',
        title: 'Месенджер у реальному часі та Стрічка',
        description:
          'Eternal випускає свою багату стрічку постів, історій, голосових відеонотаток, налаштувань чату та миттєвих повідомлень із налаштовуваними реакціями та аудіоформатами.',
        badge: 'Еволюція платформи',
      },
      {
        date: 'Серпень 2026',
        title: 'Музичний Хаб, Голосові кімнати та Світ',
        description:
          'Ми щодня вдосконалюємо нашу платформу, додаємо нові функції, системи, алгоритми, збираємо аналітику та працюємо над цим проєктом.',
        badge: 'Глобальна екосистема',
      },
    ],
    futureHeading: '2026 І НАДАЛІ...',
    futureDescription:
      'Ми продовжуємо робити Eternal найкращим, найбільш надійним та живим простором для друзів, авторів та спільнот по всьому світу. Можливо, навіть для міжгалактичного зв’язку — хто знає?',
    joinButton: 'Відкрити Eternal',
    previewFeedUser: 'Міхал Аг',
    previewFeedLocation: 'Київ, Україна',
    previewFeedCaption:
      'Моменти золотого заходу сонця разом із Eternal 🌅✨ Вдячна нашій спільноті!',
    previewFeedMusic: 'Resonance — HOME',
    previewChatTitle: '✨ Eternal Команда та Друзі',
    previewChatMsg1:
      'Всім привіт! Оновлення аудіо-нотаток та реал-тайм синхронізація вже працюють! 🚀',
    previewChatMsg2: 'Протестував на ПК та телефоні — все літає! 💜',
    previewChatTyping: 'Ілля набирає повідомлення...',
    previewProfileRole: 'Співзасновник та Архітектор',
    previewProfileBio: 'Створюємо майбутнє соціальних комунікацій в Eternal.',
  },
  Deutsch: {
    heroTag: 'ÜBER ETERNAL',
    title: 'ÜBER ETERNAL',
    subtitle:
      'Eternal ist die moderne Kommunikationsplattform für echte Verbindungen durch Sprach-, Video- und Textfunktionen.',
    storyTitle: 'DIE ETERNAL GESCHICHTE',
    storySubtitle:
      'Eternal wurde mit einer klaren Vision geschaffen: authentische und schnelle Kommunikation für moderne Gemeinschaften.',
    milestones: [
      {
        date: 'Juni 2026',
        title: 'Die Entstehung & Architektur',
        description:
          'Nikolaj Agh, Mihal Agh und Ilya Podorozhnyi beginnen die Entwicklung von Eternal in Kiew, Ukraine.',
        badge: 'Beginn',
      },
      {
        date: 'Juli 2026',
        title: 'Echtzeit-Messenger & Feed',
        description: 'Einführung des Feeds, Stories, Videonotizen und Echtzeit-Nachrichten.',
        badge: 'Evolution',
      },
      {
        date: 'August 2026',
        title: 'Sprachräume & globale Reichweite',
        description: 'Live-Audio-Räume, Musik-Integration und mehrsprachige Unterstützung.',
        badge: 'Ökosystem',
      },
    ],
    futureHeading: '2026 UND DARÜBER HINAUS...',
    futureDescription:
      'Wir machen Eternal zur besten Plattform für Freunde und Communities weltweit.',
    joinButton: 'Eternal öffnen',
    previewFeedUser: 'Mihal Agh',
    previewFeedLocation: 'Kiew, Ukraine',
    previewFeedCaption: 'Schöne Momente mit Eternal! 🌅✨',
    previewFeedMusic: 'Resonance — HOME',
    previewChatTitle: '✨ Eternal Team',
    previewChatMsg1: 'Die neuen Updates sind online! 🚀',
    previewChatMsg2: 'Läuft super schnell! 💜',
    previewChatTyping: 'Ilya tippt...',
    previewProfileRole: 'Mitgründer & Architekt',
    previewProfileBio: 'Gestaltung der Zukunft sozialer Netzwerke.',
  },
  Español: {
    heroTag: 'SOBRE ETERNAL',
    title: 'SOBRE ETERNAL',
    subtitle:
      'Eternal es la plataforma de comunicación de última generación para conectar a través de voz, video y mensajería en tiempo real.',
    storyTitle: 'LA HISTORIA DE ETERNAL',
    storySubtitle:
      'Eternal nació para crear un espacio auténtico, rápido y seguro para comunidades modernas.',
    milestones: [
      {
        date: 'Junio 2026',
        title: 'Los Inicios y Arquitectura',
        description:
          'Nikolaj Agh, Mihal Agh e Ilya Podorozhnyi inician el desarrollo de Eternal en Kiev, Ucrania.',
        badge: 'Génesis',
      },
      {
        date: 'Julio 2026',
        title: 'Mensajería en tiempo real y Feed',
        description:
          'Lanzamiento de publicaciones, historias y notas de video con reacciones interactivas.',
        badge: 'Evolución',
      },
      {
        date: 'Agosto 2026',
        title: 'Salas de voz y Ecosistema Global',
        description: 'Salas de audio en vivo, sincronización de música y soporte multilingüe.',
        badge: 'Ecosistema',
      },
    ],
    futureHeading: '2026 Y EN ADELANTE...',
    futureDescription:
      'Seguimos construyendo la plataforma más confiable para comunidades y creadores.',
    joinButton: 'Abrir Eternal',
    previewFeedUser: 'Mihal Agh',
    previewFeedLocation: 'Kiev, Ucrania',
    previewFeedCaption: 'Momentos increíbles con Eternal 🌅✨',
    previewFeedMusic: 'Resonance — HOME',
    previewChatTitle: '✨ Equipo Eternal',
    previewChatMsg1: '¡Las notas de audio ya están activas! 🚀',
    previewChatMsg2: '¡Funciona súper fluido! 💜',
    previewChatTyping: 'Ilya está escribiendo...',
    previewProfileRole: 'Cofundador y Arquitecto',
    previewProfileBio: 'Construyendo el futuro social en Eternal.',
  },
  Français: {
    heroTag: 'À PROPOS D’ETERNAL',
    title: 'À PROPOS D’ETERNAL',
    subtitle:
      'Eternal est la plateforme sociale de nouvelle génération pour créer des liens authentiques grâce à la voix, la vidéo et la messagerie instantanée.',
    storyTitle: 'L’HISTOIRE D’ETERNAL',
    storySubtitle:
      'Eternal a été conçu pour offrir une communication authentique et sécurisée aux communautés modernes.',
    milestones: [
      {
        date: 'Juin 2026',
        title: 'La Création et l’Architecture',
        description:
          'Nikolaj Agh, Mihal Agh et Ilya Podorozhnyi débutent le développement d’Eternal à Kiev, Ukraine.',
        badge: 'Genèse',
      },
      {
        date: 'Juillet 2026',
        title: 'Messagerie en temps réel et Fil d’actualité',
        description: 'Déploiement du fil de publications, stories et notes vidéo interactives.',
        badge: 'Évolution',
      },
      {
        date: 'Août 2026',
        title: 'Salons vocaux et Écosystème mondial',
        description: 'Salons audio en direct, intégration musicale et support multilingue.',
        badge: 'Écosystème',
      },
    ],
    futureHeading: '2026 ET AU-DELÀ...',
    futureDescription:
      'Nous continuons à faire d’Eternal la meilleure plateforme pour amis et créateurs.',
    joinButton: 'Ouvrir Eternal',
    previewFeedUser: 'Mihal Agh',
    previewFeedLocation: 'Kiev, Ukraine',
    previewFeedCaption: 'Moments magiques sur Eternal 🌅✨',
    previewFeedMusic: 'Resonance — HOME',
    previewChatTitle: '✨ Équipe Eternal',
    previewChatMsg1: 'Les nouvelles notes vocales sont en ligne ! 🚀',
    previewChatMsg2: 'Testé sur mobile, super fluide ! 💜',
    previewChatTyping: 'Ilya est en train d’écrire...',
    previewProfileRole: 'Co-fondateur & Architecte',
    previewProfileBio: 'Bâtir le futur des réseaux sociaux chez Eternal.',
  },
};
