export interface RegionalSubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface RegionalSection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr: string;
  subsections: RegionalSubsection[];
}

export interface RegionalPolicyTranslation {
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
  sections: RegionalSection[];
}

export const REGIONAL_PRIVACY_DATA: Record<'en' | 'uk', RegionalPolicyTranslation> = {
  en: {
    hero: {
      archivedLink: 'Archived Versions',
      title: 'REGIONAL PRIVACY POLICIES & LOCAL LAWS',
      effectiveDate: 'Effective: September 1, 2026 • Last updated: August 30, 2026',
      lastUpdated: 'Last Updated: August 30, 2026',
      description:
        'Depending on where you reside or access Eternal from, specific data protection statutes and local privacy regulations provide you with additional rights regarding your personal information. This Regional Privacy Policy supplements the Eternal Privacy Policy and outlines our legal compliance with regional frameworks across Europe, the United States, Ukraine, and worldwide.',
    },
    toc: {
      contents: 'Table of Contents',
      readProgress: '% read',
      print: 'Print Document',
      backToTop: 'Back to top',
    },
    sections: [
      {
        id: 'eea-uk-gdpr',
        number: '1',
        title: 'European Economic Area (EEA), UK & Switzerland (GDPR)',
        iconName: 'Globe',
        tldr: 'Under GDPR/UK GDPR, we process data based on legal grounds like contract fulfillment and legitimate interest, ensuring standard contractual clauses for international transfers.',
        subsections: [
          {
            id: 'gdpr-legal-bases',
            title: '1.1 Legal Bases for Processing',
            content: [
              'If you are located in the EEA, the United Kingdom, or Switzerland, Ag Mykola and Ag Mihal, the founders operating the Eternal project in Ukraine, act as the Data Controllers for your personal data. We process your data under the following legal bases pursuant to Article 6 of the General Data Protection Regulation (GDPR):',
            ],
            bullets: [
              'Contractual Necessity: To provide, maintain, and deliver our core services, verify user accounts, process subscriptions, and facilitate real-time chat and voice communications in accordance with our Terms of Service.',
              'Legitimate Interests: To detect and prevent fraud, secure our servers against malicious intrusions, investigate policy violations, and improve platform performance, provided our interests are not overridden by your fundamental rights.',
              'Consent: Where you have given explicit consent for specific features (such as optional telemetry, camera/microphone permissions, or marketing notifications), which you may withdraw at any time.',
              'Legal Obligation: To comply with mandatory statutory obligations, financial accounting laws, and lawful court subpoenas.',
            ],
          },
          {
            id: 'gdpr-rights',
            title: '1.2 European Data Subject Rights',
            content: [
              'Under GDPR and UK GDPR, you have comprehensive rights regarding your personal data:',
            ],
            bullets: [
              'Right of Access (Art. 15): You can request confirmation and a full copy of the personal data we hold about you.',
              'Right to Rectification (Art. 16): You can correct inaccurate or incomplete personal information directly in your account settings or by contacting us.',
              'Right to Erasure / "Right to be Forgotten" (Art. 17): You can request complete deletion of your account and associated personal data.',
              'Right to Restriction of Processing (Art. 18): You can request temporary suspension of data processing under certain dispute conditions.',
              'Right to Data Portability (Art. 20): You can obtain your personal data in a structured, machine-readable JSON/archive format (available via our Data Package tool).',
              'Right to Object (Art. 21): You can object to processing based on legitimate interests or direct marketing at any time.',
              'Automated Decision-Making (Art. 22): You have the right not to be subject to decisions based solely on automated processing having legal effects.',
            ],
          },
          {
            id: 'gdpr-transfers',
            title: '1.3 International Data Transfers',
            content: [
              'When we transfer personal data outside the EEA/UK, we implement robust safeguards approved by the European Commission, including Standard Contractual Clauses (SCCs), technical encryption at rest and in transit, and supplementary security measures.',
            ],
          },
        ],
      },
      {
        id: 'us-state-laws',
        number: '2',
        title: 'United States State Privacy Rights (CCPA / CPRA & Others)',
        iconName: 'Shield',
        tldr: 'We do NOT sell or share your personal information for cross-context behavioral advertising. US residents enjoy rights to know, delete, correct, and limit sensitive data.',
        subsections: [
          {
            id: 'us-privacy-overview',
            title: '2.1 Notice at Collection & Disclosures',
            content: [
              'This section applies to residents of California (under CCPA as amended by CPRA), Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), Utah (UCPA), Texas (TDPSA), and other US states with comprehensive privacy laws.',
              'We collect categories of personal information including identifiers (name, email, IP address, username), commercial records, internet activity logs, audio/video data (only when actively using voice/video channels), and approximate location derived from IP.',
              'We do NOT sell your personal information for monetary compensation, nor do we share it for cross-context behavioral advertising. We have not sold or shared any consumer personal data in the preceding 12 months.',
            ],
          },
          {
            id: 'us-consumer-rights',
            title: '2.2 Your California and US State Rights',
            content: [
              'US consumers have the following rights under applicable state privacy frameworks:',
            ],
            bullets: [
              'Right to Know & Access: You can request details about the categories and specific pieces of personal information collected, sources, business purposes, and third parties disclosed to.',
              'Right to Delete: You can request deletion of personal information collected from you, subject to statutory retention exceptions.',
              'Right to Correct: You have the right to correct inaccurate personal information.',
              'Right to Limit Use of Sensitive Personal Information: We only use sensitive data (e.g., login credentials) strictly to deliver the service.',
              'Non-Discrimination: We will never deny services, charge different prices, or provide a different quality of service for exercising your privacy rights.',
              'California Shine the Light: We do not share personal information with third parties for their direct marketing purposes.',
              'Global Privacy Control (GPC): We honor GPC and Do Not Track browser signals.',
            ],
          },
        ],
      },
      {
        id: 'ukraine-privacy-law',
        number: '3',
        title: 'Ukraine National Privacy Regulations (Law No. 2297-VI)',
        iconName: 'FileCheck',
        tldr: 'As a company headquartered in Kyiv, Ukraine, we fully comply with Law No. 2297-VI, guaranteeing transparent processing and full rights to all Ukrainian users.',
        subsections: [
          {
            id: 'ukraine-statute-rights',
            title: '3.1 Rights under the Law of Ukraine "On Personal Data Protection"',
            content: [
              'Eternal is operated by Ag Mykola and Ag Mihal in Ukraine. The Constitution of Ukraine and the Law of Ukraine "On Personal Data Protection" No. 2297-VI provide applicable protections for data subjects. Pursuant to Article 8 of the Law, data subjects have the right:',
            ],
            bullets: [
              'To know about the sources of collection, location of their personal data, purpose of processing, and location of the controller/processor.',
              'To receive information regarding the conditions for providing access to personal data, including information about third parties to whom data is transferred.',
              'To access their personal data and receive a response regarding whether their personal data is being processed within 30 calendar days.',
              'To submit a substantiated demand to the controller objecting to the processing of their personal data or requesting modification or destruction.',
              'To protect their personal data from unlawful processing, accidental loss, destruction, damage, and provision of inaccurate information.',
              'To apply legal remedies and file complaints with the Ukrainian Parliament Commissioner for Human Rights or directly with the courts.',
            ],
          },
        ],
      },
      {
        id: 'other-jurisdictions',
        number: '4',
        title: 'Other International Jurisdictions (Brazil, Canada, Asia-Pacific)',
        iconName: 'Scale',
        tldr: 'We respect privacy frameworks worldwide including Brazil (LGPD), Canada (PIPEDA), Australia (Privacy Act), Japan (APPI), and South Korea (PIPA).',
        subsections: [
          {
            id: 'global-frameworks',
            title: '4.1 Worldwide Privacy Protections',
            content: ['Eternal ensures high privacy standards globally:'],
            bullets: [
              'Brazil (LGPD - Lei Geral de Proteção de Dados): Brazilian users can confirm processing, access data, correct incomplete data, anonymize or block unnecessary data, and revoke consent at any time.',
              'Canada (PIPEDA): Canadian residents are entitled to access and challenge the accuracy and completeness of their personal information.',
              'Australia (Privacy Act 1988): Australian users are protected under the Australian Privacy Principles (APPs) with rights of access and correction.',
              'Japan (APPI) & South Korea (PIPA): We ensure robust data security safeguards and transparent notifications regarding data retention and disposal.',
            ],
          },
        ],
      },
      {
        id: 'exercising-rights',
        number: '5',
        title: 'How to Exercise Your Regional Privacy Rights',
        iconName: 'Key',
        tldr: 'Submit privacy requests via account settings, the Data Package tool, or by contacting our Data Protection Officer with identity verification.',
        subsections: [
          {
            id: 'submission-process',
            title: '5.1 Request Verification and Timelines',
            content: [
              'You may exercise your statutory privacy rights at any time without fee or penalty through the following channels:',
            ],
            bullets: [
              'Self-Service Settings: Access, correct, and delete personal data directly in your Eternal Account Settings -> Privacy & Safety tab.',
              'Data Download Package: Request an automated export of your complete account history, messages, and profile records.',
              'Email Submission: Send a verified request to privacy@eternal.com or directly to our Data Protection Officer.',
              'Verification: To protect your account security, we will verify your identity by confirming access to your registered email address before processing deletion or access requests.',
              'Response Timelines: We respond to all verified requests within 30 calendar days (or within 45 days where permitted for complex US state requests with notice).',
            ],
          },
        ],
      },
      {
        id: 'contact-and-dpo',
        number: '6',
        title: 'Data Protection Officer and Supervisory Contacts',
        iconName: 'Mail',
        tldr: 'Reach out to our Data Protection Officer in Kyiv, Ukraine or your local supervisory authority for any questions or complaints.',
        subsections: [
          {
            id: 'dpo-supervisory-details',
            title: '6.1 Contact Information',
            content: [
              'For any questions, concerns, or complaints regarding this Regional Privacy Policy or our compliance with local laws, please contact our team directly:',
            ],
            bullets: [
              'Data Protection Officer (DPO): aghnikolaj1@gmail.com',
              'Legal & Privacy Operations: privacy@eternal.com',
              'Project operators: Ag Mykola and Ag Mihal, Ukraine',
              'Supervisory Authority (Ukraine): Secretariat of the Ukrainian Parliament Commissioner for Human Rights (hotline@ombudsman.gov.ua).',
              'Supervisory Authority (EU): You may also lodge a complaint with your national Data Protection Authority (DPA) in the EU member state where you reside.',
            ],
          },
        ],
      },
    ],
  },
  uk: {
    hero: {
      archivedLink: 'Архівні версії',
      title: 'РЕГІОНАЛЬНІ ПОЛІТИКИ КОНФІДЕНЦІЙНОСТІ ТА МІСЦЕВІ ЗАКОНИ',
      effectiveDate: 'Набуття чинності: 1 вересня 2026 р. • Останнє оновлення: 30 серпня 2026 р.',
      lastUpdated: 'Останнє оновлення: 30 серпня 2026 р.',
      description:
        'Залежно від країни вашого проживання або місцезнаходження, спеціальні законодавчі акти у сфері захисту даних надають вам додаткові права. Ця Регіональна політика доповнює загальну Політику конфіденційності Eternal та закріплює наші зобов’язання перед користувачами в Європі, США, Україні та всьому світі.',
    },
    toc: {
      contents: 'Зміст документа',
      readProgress: '% прочитано',
      print: 'Друк документа',
      backToTop: 'Нагору',
    },
    sections: [
      {
        id: 'eea-uk-gdpr',
        number: '1',
        title: 'Європейська економічна зона (ЄЕЗ), Велика Британія та Швейцарія (GDPR)',
        iconName: 'Globe',
        tldr: 'Згідно з регламентом GDPR, ми обробляємо дані виключно на законних підставах та гарантуємо стандартні договірні положення для захисту передачі.',
        subsections: [
          {
            id: 'gdpr-legal-bases',
            title: '1.1 Правові підстави обробки даних',
            content: [
              'Для користувачів з країн ЄЕЗ, Великобританії та Швейцарії засновники Ag Mykola та Ag Mihal, які керують проєктом Eternal в Україні, виступають Контролерами персональних даних. Ми обробляємо персональні дані відповідно до статті 6 GDPR:',
            ],
            bullets: [
              'Виконання договору: забезпечення роботи платформи, аутентифікація, надання доступу до чатів, голосових серверів та підписок.',
              'Законні інтереси: запобігання кібератакам, виявлення шахрайства, оптимізація інфраструктури без порушення фундаментальних прав користувачів.',
              'Згода суб’єкта: для опціональних аналітичних функцій чи сповіщень, яку можна відкликати в будь-який час.',
              'Юридичні зобов’язання: дотримання вимог чинного законодавства та податкового обліку.',
            ],
          },
          {
            id: 'gdpr-rights',
            title: '1.2 Права суб’єктів даних за GDPR',
            content: ['Регламент GDPR надає користувачам такі невід’ємні права:'],
            bullets: [
              'Право на доступ (ст. 15): отримання копії всіх зібраних персональних даних.',
              'Право на виправлення (ст. 16): оновлення застарілих або неточних даних.',
              'Право на знищення / «Право бути забутим» (ст. 17): повне видалення облікового запису та даних.',
              'Право на обмеження обробки (ст. 18): блокування дій з даними на період вирішення суперечок.',
              'Право на мобільність даних (ст. 20): завантаження даних у структурованому форматі JSON.',
              'Право на заперечення (ст. 21): заборона обробки на основі законного інтересу.',
            ],
          },
        ],
      },
      {
        id: 'us-state-laws',
        number: '2',
        title: 'Законодавство штатів США (CCPA / CPRA та інші)',
        iconName: 'Shield',
        tldr: 'Ми НЕ продаємо персональні дані та не передаємо їх для поведінкової реклами. Користувачі в США мають право на доступ, видалення та виправлення.',
        subsections: [
          {
            id: 'us-privacy-overview',
            title: '2.1 Повідомлення про збір та відсутність продажу даних',
            content: [
              'Цей розділ стосується жителів Каліфорнії (CCPA/CPRA), Вірджинії (VCDPA), Колорадо (CPA), Техасу (TDPSA) та інших штатів.',
              'Ми категорично НЕ продаємо персональні дані користувачів за винагороду та НЕ передаємо їх для таргетованої міжсайтової реклами.',
            ],
            bullets: [
              'Право знати та отримати доступ до категорій та конкретних зібраних даних.',
              'Право на видалення персональних даних.',
              'Право на виправлення недостовірної інформації.',
              'Право на недискримінацію за реалізацію прав конфіденційності.',
              'Підтримка сигналів Global Privacy Control (GPC) у браузерах.',
            ],
          },
        ],
      },
      {
        id: 'ukraine-privacy-law',
        number: '3',
        title: 'Національне законодавство України (Закон № 2297-VI)',
        iconName: 'FileCheck',
        tldr: 'Eternal діє в юрисдикції України та гарантує всі права суб’єктів персональних даних згідно зі ст. 8 Закону «Про захист персональних даних».',
        subsections: [
          {
            id: 'ukraine-statute-rights',
            title: '3.1 Права згідно із Законом України «Про захист персональних даних»',
            content: [
              'Проєктом Eternal в Україні керують Ag Mykola та Ag Mihal. Відповідно до статті 8 Закону України «Про захист персональних даних» № 2297-VI, суб’єкт персональних даних має право:',
            ],
            bullets: [
              'Знати про джерела збирання, місцезнаходження своїх персональних даних, мету їх обробки та місцезнаходження володільця чи розпорядника.',
              'Отримувати інформацію про умови надання доступу до персональних даних, зокрема інформацію про третіх осіб.',
              'На доступ до своїх персональних даних та отримання відповіді про їх обробку протягом 30 календарних днів.',
              'Пред’являти вмотивовану вимогу щодо заборони обробки або зміни чи знищення своїх персональних даних.',
              'На захист своїх персональних даних від незаконної обробки, випадкової втрати, знищення чи пошкодження.',
              'Звертатися зі скаргами на обробку своїх даних до Уповноваженого Верховної Ради України з прав людини або до суду.',
            ],
          },
        ],
      },
      {
        id: 'other-jurisdictions',
        number: '4',
        title: 'Інші міжнародні юрисдикції (Бразилія, Канада, Азійсько-Тихоокеанський регіон)',
        iconName: 'Scale',
        tldr: 'Ми забезпечуємо високі стандарти приватності в усьому світі, включаючи норми Бразилії (LGPD), Канади (PIPEDA) та Австралії.',
        subsections: [
          {
            id: 'global-frameworks',
            title: '4.1 Міжнародний захист',
            content: [
              'Користувачі платформи Eternal у всьому світі захищені відповідними регіональними нормами: LGPD у Бразилії, PIPEDA у Канаді, Privacy Act в Австралії та APPI в Японії.',
            ],
          },
        ],
      },
      {
        id: 'exercising-rights',
        number: '5',
        title: 'Як реалізувати свої регіональні права',
        iconName: 'Key',
        tldr: 'Подавайте запити через налаштування облікового запису, інструмент вивантаження даних або звертайтеся до нашого DPO.',
        subsections: [
          {
            id: 'submission-process',
            title: '5.1 Процедура та терміни обробки запитів',
            content: ['Ви можете реалізувати свої права такими зручними способами:'],
            bullets: [
              'Через налаштування акаунту: вкладка «Конфіденційність та безпека» дозволяє редагувати дані або видалити обліковий запис.',
              'Пакет даних Eternal: інструмент автоматичного вивантаження всієї історії профілю та повідомлень.',
              'Звернення на e-mail: надішліть листа на адресу privacy@eternal.com або безпосередньо DPO.',
              'Термін відповіді: ми надаємо офіційну відповідь на всі верифіковані запити протягом 30 календарних днів.',
            ],
          },
        ],
      },
      {
        id: 'contact-and-dpo',
        number: '6',
        title: 'Контакти Офіцера із захисту даних та контролюючих органів',
        iconName: 'Mail',
        tldr: 'Зв’яжіться з нашим Офіцером із захисту даних у м. Київ, Україна або зверніться до регуляторних органів.',
        subsections: [
          {
            id: 'dpo-supervisory-details',
            title: '6.1 Контактні дані',
            content: ['З усіх питань щодо Регіональної політики конфіденційності звертайтеся:'],
            bullets: [
              'Офіцер із захисту даних (DPO): aghnikolaj1@gmail.com',
              'Юридичний департамент: privacy@eternal.com',
              'Оператори проєкту: Ag Mykola та Ag Mihal, Україна',
              'Національний наглядовий орган: Секретаріат Уповноваженого Верховної Ради України з прав людини (hotline@ombudsman.gov.ua).',
            ],
          },
        ],
      },
    ],
  },
};
