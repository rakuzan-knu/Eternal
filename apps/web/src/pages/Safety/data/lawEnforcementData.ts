export interface LawEnforcementSubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface LawEnforcementSection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr: string;
  subsections: LawEnforcementSubsection[];
}

export interface LawEnforcementTranslation {
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
  sections: LawEnforcementSection[];
}

export const LAW_ENFORCEMENT_DATA: Record<'en' | 'uk', LawEnforcementTranslation> = {
  en: {
    hero: {
      archivedLink: 'Trust & Safety Legal Guides',
      title: 'GUIDELINES FOR LAW ENFORCEMENT',
      effectiveDate: 'Effective: September 1, 2026 • Last updated: August 30, 2026',
      lastUpdated: 'Last Updated: August 30, 2026',
      description:
        'These guidelines provide information for domestic and international law enforcement agencies, government authorities, and courts seeking user records or emergency disclosures from Eternal Inc. (headquartered in Kyiv, Ukraine).',
    },
    toc: {
      contents: 'Table of Contents',
      readProgress: '% read',
      print: 'Print Document',
      backToTop: 'Back to top',
    },
    sections: [
      {
        id: 'legal-process-requirements',
        number: '1',
        title: 'Legal Process Requirements & Authority',
        iconName: 'Scale',
        tldr: 'We disclose user data only in response to valid, legally binding court orders, search warrants, or statutory legal processes.',
        subsections: [
          {
            id: 'statutory-standards',
            title: '1.1 Requirement of Valid Legal Process',
            content: [
              'Eternal Inc. strictly adheres to applicable data privacy statutes, international treaties, and human rights standards. We do not disclose non-public user information without valid, enforceable legal process served in accordance with applicable jurisdictional rules.',
            ],
            bullets: [
              'Subpoenas & Production Orders: Required to compel basic subscriber information (such as registered email address, account registration timestamp, and IP connection logs).',
              'Court Orders (e.g. 18 U.S.C. § 2703(d)): Required for transactional records, account associations, and message routing metadata.',
              'Search Warrants: Required for the disclosure of stored communications content (such as cloud chat messages or private uploaded media).',
              'International Requests: Foreign authorities must issue requests through Mutual Legal Assistance Treaties (MLAT) or Letters Rogatory recognized by competent courts in Ukraine or relevant jurisdictions.',
            ],
          },
        ],
      },
      {
        id: 'emergency-requests',
        number: '2',
        title: 'Emergency Data Requests (Exigent Circumstances)',
        iconName: 'AlertTriangle',
        tldr: 'Emergency requests involving imminent danger of death or serious physical injury are evaluated 24/7 on an expedited basis.',
        subsections: [
          {
            id: 'emergency-procedure',
            title: '2.1 Submitting an Emergency Disclosure Request',
            content: [
              'If there is an ongoing emergency involving imminent risk of death, severe bodily injury, or immediate child endangerment, law enforcement officers may submit an expedited Emergency Request.',
            ],
            bullets: [
              '1. Nature of the emergency and why disclosure of information is urgently needed without waiting for a court order.',
              '2. Identity of the person in immediate danger.',
              '3. Specific account identifiers (Eternal username, user ID, email address).',
              '4. Official law enforcement credentials, agency name, badge number, and government-issued email address.',
              '5. Submit directly to legal@eternal.app with subject line: "EMERGENCY DATA REQUEST - [AGENCY NAME]".',
            ],
          },
        ],
      },
      {
        id: 'preservation-requests',
        number: '3',
        title: 'Data Preservation Requests',
        iconName: 'ShieldAlert',
        tldr: 'Law enforcement can request formal 90-day preservation of existing account records while securing a court order.',
        subsections: [
          {
            id: 'preservation-rules',
            title: '3.1 Preserving Records (18 U.S.C. § 2703(f))',
            content: [
              'Upon receipt of a formal written preservation request from authorized law enforcement, Eternal will preserve a temporary snapshot of existing account records for ninety (90) days pending the issuance of valid legal process.',
              'Preservation applies only to records existing at the exact time the request is received; we do not engage in prospective, ongoing real-time surveillance.',
            ],
          },
        ],
      },
      {
        id: 'technical-limitations',
        number: '4',
        title: 'Technical & Cryptographic Limitations',
        iconName: 'Lock',
        tldr: 'Eternal cannot provide decrypted contents of End-to-End Encrypted secret chats or recordings of live voice/video calls.',
        subsections: [
          {
            id: 'encryption-limits',
            title: '4.1 Zero-Knowledge & Ephemeral Storage',
            content: [
              'Law enforcement agencies must understand the architectural boundaries of our privacy systems:',
            ],
            bullets: [
              'End-to-End Encrypted (E2EE) Secret Chats: Encryption keys are held only on user endpoints. Eternal cannot decrypt or disclose plaintext message content for E2EE chats.',
              'Live Voice & Video Rooms: Voice and video hangouts are ephemeral WebRTC streams that are never recorded, tapped, or stored on our servers.',
              'Disappearing Messages: Once deleted by user timer, ephemeral messages are permanently purged from memory and cannot be recovered.',
            ],
          },
        ],
      },
      {
        id: 'user-notice',
        number: '5',
        title: 'User Notification & Contact Channel',
        iconName: 'Mail',
        tldr: 'We notify affected users unless legally prohibited by a non-disclosure order. Official legal service is accepted at legal@eternal.app.',
        subsections: [
          {
            id: 'notice-policy',
            title: '5.1 Policy on User Notification',
            content: [
              'Eternal’s policy is to notify users of requests for their data before disclosure, providing them an opportunity to seek legal protection, unless prohibited by a statutory non-disclosure order issued by a court of competent jurisdiction.',
            ],
          },
          {
            id: 'contact-channel',
            title: '5.2 Official Legal Service Channel',
            content: [
              'All formal legal process, subpoenas, and preservation requests must be transmitted electronically from an official government domain to:',
            ],
            bullets: [
              'Legal & Law Enforcement Operations: legal@eternal.app',
              'Safety & Urgent Reports: safety@eternal.app',
              'Physical Service: Eternal Inc., Legal Department, Kyiv, Ukraine',
            ],
          },
        ],
      },
    ],
  },
  uk: {
    hero: {
      archivedLink: 'Юридичні посібники та безпека',
      title: 'КЕРІВНИЦТВО ДЛЯ ПРАВООХОРОННИХ ОРГАНІВ',
      effectiveDate: 'Набуття чинності: 1 вересня 2026 р. • Останнє оновлення: 30 серпня 2026 р.',
      lastUpdated: 'Останнє оновлення: 30 серпня 2026 р.',
      description:
        'Цей документ містить правила та процедури взаємодії з правоохоронними органами, судами та державними регуляторами, які звертаються із запитами щодо надання інформації про користувачів до Eternal Inc. (м. Київ, Україна).',
    },
    toc: {
      contents: 'Зміст документа',
      readProgress: '% прочитано',
      print: 'Друк керівництва',
      backToTop: 'Нагору',
    },
    sections: [
      {
        id: 'legal-process-requirements',
        number: '1',
        title: 'Вимоги до офіційних правових запитів',
        iconName: 'Scale',
        tldr: 'Розкриття інформації здійснюється виключно на підставі належно оформлених ухвал суду або офіційних судових ордерів.',
        subsections: [
          {
            id: 'statutory-standards',
            title: '1.1 Процесуальні підстави',
            content: [
              'Eternal Inc. суворо дотримується законодавства України, міжнародних конвенцій та норм захисту персональних даних. Надання інформації здійснюється за наявності ухвали слідчого судді або належного міжнародного правового запиту (MLAT).',
            ],
          },
        ],
      },
      {
        id: 'emergency-requests',
        number: '2',
        title: 'Екстрені запити (Загроза життю)',
        iconName: 'AlertTriangle',
        tldr: 'Запити у випадках безпосередньої загрози життю, здоров’ю або безпеці дітей розглядаються в пріоритетному порядку 24/7.',
        subsections: [
          {
            id: 'emergency-procedure',
            title: '2.1 Порядок подання екстреного запиту',
            content: [
              'У невідкладних випадках співробітники правоохоронних органів можуть надіслати терміновий запит на legal@eternal.app із зазначенням характеру загрози, ідентифікаторів профілю та службових контактів.',
            ],
          },
        ],
      },
      {
        id: 'preservation-requests',
        number: '3',
        title: 'Збереження даних (Preservation)',
        iconName: 'ShieldAlert',
        tldr: 'За письмовим запитом правоохоронних органів дані акаунта можуть бути заморожені на 90 днів до отримання ухвали суду.',
        subsections: [
          {
            id: 'preservation-rules',
            title: '3.1 Тимчасове збереження',
            content: [
              'Eternal зберігає наявний зріз даних облікового запису на строк до 90 днів за офіційним зверненням правоохоронного органу для подальшого отримання судового рішення.',
            ],
          },
        ],
      },
      {
        id: 'technical-limitations',
        number: '4',
        title: 'Технічні обмеження та шифрування',
        iconName: 'Lock',
        tldr: 'Eternal не записує голосові дзвінки та технічно не має доступу до секретних E2EE-чатів.',
        subsections: [
          {
            id: 'encryption-limits',
            title: '4.1 Архітектурні межі конфіденційності',
            content: ['Правоохоронні органи повинні враховувати архітектуру сервісу:'],
            bullets: [
              'Секретні чати (E2EE): ключі шифрування генеруються на пристроях користувачів, сервери не мають доступу до розшифрованого тексту.',
              'Голосові та відеокімнати: передаються через WebRTC в реальному часі та не записуються.',
            ],
          },
        ],
      },
      {
        id: 'user-notice',
        number: '5',
        title: 'Повідомлення користувачів та офіційні контакти',
        iconName: 'Mail',
        tldr: 'Ми повідомляємо користувачів про запити, якщо інше не заборонено судом. Офіційні запити приймаються на legal@eternal.app.',
        subsections: [
          {
            id: 'contact-channel',
            title: '5.1 Офіційні реквізити для правоохоронців',
            content: [
              'Усі запити мають надходити з офіційних державних доменів на електронну пошту юридичного департаменту:',
            ],
            bullets: [
              'Юридичний департамент: legal@eternal.app',
              'Служба безпеки: safety@eternal.app',
              'Головний офіс: Eternal Inc., м. Київ, Україна',
            ],
          },
        ],
      },
    ],
  },
};
