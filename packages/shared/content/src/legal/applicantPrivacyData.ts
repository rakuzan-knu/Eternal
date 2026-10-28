export interface CandidatePolicySubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface CandidatePolicySection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr: string;
  subsections: CandidatePolicySubsection[];
}

export interface CandidatePolicyTranslation {
  hero: {
    archivedLink: string;
    title: string;
    effectiveDate: string;
    introLead: string;
    introBullets: string[];
    introDefinition: string;
    serviceLinkText: string;
  };
  toc: {
    contents: string;
    readProgress: string;
    print: string;
    backToTop: string;
  };
  sections: CandidatePolicySection[];
}

export const APPLICANT_PRIVACY_DATA: Record<'en' | 'uk', CandidatePolicyTranslation> = {
  en: {
    hero: {
      archivedLink: 'Archived Versions',
      title: 'APPLICANT AND CANDIDATE PRIVACY POLICY',
      effectiveDate: 'Last updated: September 15, 2025 • Effective: September 1, 2026',
      introLead:
        'This Notice of Data Collection, Processing and Transfer (“Notice”) for the Eternal project, operated in Ukraine by its founders Ag Mykola and Ag Mihal, describes, in the context of your candidacy for employment at Eternal:',
      introBullets: [
        'What data Eternal collects about you',
        'How Eternal processes your information',
        'How we disclose your information',
        'How long we retain your information',
        'Your rights regarding your information',
      ],
      introDefinition:
        'For purposes of this Notice, “Personal Data” means any information concerning an identified or identifiable individual and “Processing” means any operation with respect to Personal Data, such as collection, retrieval, access, use, disclosure, storage or disposal of Personal Data.',
      serviceLinkText: 'Your use of Eternal services is governed by the Eternal Privacy Policy.',
    },
    toc: {
      contents: 'Table of Contents',
      readProgress: '% read',
      print: 'Print Policy',
      backToTop: 'Back to top',
    },
    sections: [
      {
        id: 'the-information-we-collect',
        number: '1',
        title: 'The information we collect',
        iconName: 'Database',
        tldr: 'We collect contact info, CV/resume, interview scorecards, job preferences, background checks, and public professional profiles like LinkedIn.',
        subsections: [
          {
            id: 'info-collection-details',
            title: '1.1 Types of Candidate Data Collected',
            content: [
              'We collect certain information from you when you apply or are in candidacy for a role at Eternal. This includes information you provide to us, information we collect automatically, and information we receive from other sources. This information includes, but is not limited to, the following:',
            ],
            bullets: [
              'Contact information, such as your name, phone number, and email address.',
              'Employment information, such as your resume/CV, education, job history, and professional qualifications.',
              'Interview notes, such as scorecards and written feedback from personnel involved in your hiring process.',
              'Job preferences, such as your desired salary, start date, and working location or remote preference.',
              'Background check information: This includes the results of any background checks we may conduct over the course of your candidacy, as well as any information needed to facilitate the background check process, such as your government identification number.',
              'Sensitive demographic information: We may collect information such as your gender and disability status for equal opportunity compliance. We do not use this information to make decisions about your employment.',
              'Other information you may share with us, such as your portfolio, social media profiles, GitHub repositories, or details of how you heard about the position.',
              'Data collected from publicly-available sources, such as your LinkedIn profile or professional directories.',
            ],
          },
        ],
      },
      {
        id: 'how-we-use-your-information',
        number: '2',
        title: 'How we use your information',
        iconName: 'Cpu',
        tldr: 'Your data is used to review qualifications, coordinate interviews, conduct references, make employment offers, and satisfy regulatory obligations.',
        subsections: [
          {
            id: 'usage-purposes',
            title: '2.1 Purpose of Processing Candidate Data',
            content: [
              'We use the information described in the "The information we collect" section of this policy for the following purposes:',
            ],
            bullets: [
              'To communicate with you about the status of your application, including notifying you of other relevant career opportunities at Eternal.',
              'To conduct background checks and verify the information you provide in your application, such as your professional references and credentials.',
              'To assess your qualifications, technical skills, and make decisions about whether to offer you employment at Eternal.',
              'To conduct phone screens, technical assessments, and interviews.',
              'To provide you with accommodations you may need during your application and interview process.',
              'If you are offered employment at Eternal, to create an offer letter, compensation package, and other employment contracts.',
              'If you are offered an in-person interview, to coordinate and facilitate travel and logistics.',
              'To comply with equal employment monitoring, labor regulations, and other statutory obligations.',
              'To improve Eternal’s application process, including assessing our diversity, equity, and inclusion efforts.',
              'For any other legitimate business or legal purposes related to hiring and operations.',
            ],
          },
          {
            id: 'employee-records-and-ai',
            title: '2.2 Employment Records & AI Tooling Notice',
            content: [
              'Additionally, if you become employed by Eternal, your candidate information will become part of your permanent employment record and will be processed in accordance with the Eternal Employee Privacy Policy.',
              'We may use AI tooling to assist in the initial organization, formatting, and administrative evaluation of your application. If you prefer to opt out of the use of AI tooling to process your application, you can do so by contacting our talent operations team or our Data Protection Officer.',
            ],
          },
        ],
      },
      {
        id: 'how-we-disclose-your-information',
        number: '3',
        title: 'How we disclose your information',
        iconName: 'Eye',
        tldr: 'We share data with our verified background check vendors, legal counsel, and recruitment affiliates under strict confidentiality agreements.',
        subsections: [
          {
            id: 'disclosure-recipients',
            title: '3.1 Authorized Third Parties & Affiliates',
            content: [
              'Your information may be shared with Eternal’s affiliates and related companies in order to facilitate any of the recruitment purposes described in this policy. These affiliates include any service providers under written contract with Eternal (such as applicant tracking software, assessment platforms, and background screening partners).',
              'Eternal may also be required to disclose your personal information to governmental or regulatory agencies in order to comply with Ukrainian and international labor laws. We will only do this to the extent strictly necessary and required by law.',
              'We may share minimal application status information with other parties where appropriate; for example, if you were referred to Eternal by an existing employee, we may share basic updates regarding your hiring stage with your referrer.',
            ],
          },
        ],
      },
      {
        id: 'data-retention',
        number: '4',
        title: 'Data Retention',
        iconName: 'FileText',
        tldr: 'We retain candidate data only as long as needed for the hiring process and legal requirements, after which it is securely deleted or anonymized.',
        subsections: [
          {
            id: 'retention-periods',
            title: '4.1 Retention Timeframes & Archival',
            content: [
              'We will only retain your information for as long as it is needed to fulfill the recruitment and assessment purposes outlined in this policy, and as permitted or required by applicable law (typically up to 2 years for candidate talent pools unless you request earlier deletion).',
              'If you become employed at Eternal, your application information will become part of your employee file and will be retained throughout your tenure and in accordance with statutory employment archive periods.',
            ],
          },
        ],
      },
      {
        id: 'rights-regarding-personal-information',
        number: '5',
        title: 'Rights regarding the use and processing of your personal information',
        iconName: 'ShieldCheck',
        tldr: 'You have the right to access, rectify, erase, restrict, or object to the processing of your candidate data, as well as the right to data portability.',
        subsections: [
          {
            id: 'candidate-rights-overview',
            title: '5.1 Access, Rectification, and Erasure',
            content: [
              'You have specific rights under applicable data protection legislation (including the Law of Ukraine on Personal Data Protection and GDPR where applicable):',
              'You may request access to your Personal Data and request that the Company update, correct, or delete (the “right to be forgotten”) your information. You also have the right to restrict or object to the Company’s processing of your Personal Data and to request data portability in a structured, commonly used electronic format.',
              'Right To Object: You have the right to object to the processing of your Personal Data based on legitimate interests. Upon receiving your objection, processing will cease unless compelling legitimate grounds override your interests or processing is required for legal claims.',
              'You may exercise any of these rights at any time by sending an email to privacy@eternal.com or directly to our Data Protection Officer.',
            ],
          },
          {
            id: 'consent-withdrawal',
            title: '5.2 Withdrawal of Consent & Supervisory Complaints',
            content: [
              'Where processing is based on your explicit consent, you may withdraw your consent at any time. Withdrawal does not affect the lawfulness of processing conducted prior to withdrawal.',
              'If you believe that your Personal Data has been processed in violation of applicable data protection law, you have the right to lodge a complaint with your local data protection supervisory authority or the Ukrainian Parliament Commissioner for Human Rights.',
            ],
          },
        ],
      },
      {
        id: 'data-protection-officer',
        number: '6',
        title: 'Data Protection Officer',
        iconName: 'Mail',
        tldr: 'Reach out to our dedicated Data Protection Officer for any candidate privacy inquiries at Kyiv, Ukraine or via email.',
        subsections: [
          {
            id: 'dpo-contacts',
            title: '6.1 Contact Information',
            content: [
              'Eternal is a project operated by Ag Mykola and Ag Mihal in Ukraine. For any questions, requests, or concerns regarding your candidacy data or this Notice, please contact our Data Protection Officer directly:',
            ],
            bullets: [
              'Data Protection Officer Email: aghnikolaj1@gmail.com',
              'Privacy & Legal Operations: privacy@eternal.com',
              'Project operators: Ag Mykola and Ag Mihal, Ukraine',
            ],
          },
        ],
      },
    ],
  },
  uk: {
    hero: {
      archivedLink: 'Архівні версії',
      title: 'ПОЛІТИКА КОНФІДЕНЦІЙНОСТІ ДЛЯ КАНДИДАТІВ ТА ПРЕТЕНДЕНТІВ',
      effectiveDate: 'Останнє оновлення: 15 вересня 2025 р. • Набуття чинності: 1 вересня 2026 р.',
      introLead:
        'Це Повідомлення про збір, обробку та передачу персональних даних («Повідомлення») для проєкту Eternal, яким керують Ag Mykola та Ag Mihal в Україні, визначає в контексті вашої кандидатури на працевлаштування в Eternal:',
      introBullets: [
        'Які дані Eternal збирає про вас як кандидата',
        'Як саме Eternal обробляє вашу інформацію',
        'Кому та за яких умов ми розкриваємо ваші дані',
        'Скільки часу ми зберігаємо вашу інформацію',
        'Ваші законні права щодо захисту персональних даних',
      ],
      introDefinition:
        'Для цілей цього Повідомлення термін «Персональні дані» означає будь-яку інформацію про ідентифіковану фізичну особу, а «Обробка» — будь-яку операцію з даними (збір, зберігання, використання, передача або знищення).',
      serviceLinkText:
        'Використання публічних сервісів Eternal регулюється загальною Політикою конфіденційності Eternal.',
    },
    toc: {
      contents: 'Зміст політики',
      readProgress: '% прочитано',
      print: 'Друк документа',
      backToTop: 'Нагору',
    },
    sections: [
      {
        id: 'the-information-we-collect',
        number: '1',
        title: 'Інформація, яку ми збираємо',
        iconName: 'Database',
        tldr: 'Ми збираємо контактні дані, резюме, оцінки співбесід, побажання щодо посади, результати перевірок та публічні професійні профілі.',
        subsections: [
          {
            id: 'info-collection-details',
            title: '1.1 Категорії даних кандидата',
            content: [
              'Ми збираємо певні дані, коли ви подаєте заявку на вакансію або розглядаєтеся як кандидат в Eternal. Це включає надану вами інформацію, автоматично зібрані дані та інформацію з відкритих джерел:',
            ],
            bullets: [
              'Контактна інформація: повне ім’я, номер телефону, адреса електронної пошти.',
              'Дані про працевлаштування: резюме (CV), освіта, досвід роботи, сертифікати та професійні навички.',
              'Нотатки зі співбесід: оцінки, відгуки інтерв’юерів та результати технічних завдань.',
              'Побажання щодо роботи: бажаний рівень заробітної плати, дата старту, формат роботи (офіс/віддалено).',
              'Результати перевірок (background checks): результати підтвердження кваліфікації та рекомендацій.',
              'Чутливі демографічні дані: інформація про стать або статус інвалідності для дотримання законодавства про рівні можливості (не використовується для прийняття рішень про найм).',
              'Інша інформація: посилання на GitHub, портфоліо, LinkedIn або відомості про те, як ви дізналися про вакансію.',
            ],
          },
        ],
      },
      {
        id: 'how-we-use-your-information',
        number: '2',
        title: 'Як ми використовуємо вашу інформацію',
        iconName: 'Cpu',
        tldr: 'Дані використовуються для аналізу кваліфікації, організації співбесід, перевірки рекомендацій та підготовки пропозицій про роботу.',
        subsections: [
          {
            id: 'usage-purposes',
            title: '2.1 Цілі обробки даних',
            content: ['Ми використовуємо зібрану інформацію для таких цілей:'],
            bullets: [
              'Комунікація щодо статусу вашої заявки та повідомлення про відкриті відповідні позиції в Eternal.',
              'Перевірка наданих даних, кваліфікації та робочих рекомендацій.',
              'Оцінка технічних компетенцій та прийняття рішень щодо пропозиції працевлаштування.',
              'Проведення технічних інтерв’ю та співбесід.',
              'Формування офіційного оферу (пропозиції роботи) та трудових договорів у разі успішного проходження відбору.',
              'Організація логістики у випадку проведення очних зустрічей.',
              'Виконання обов’язкових вимог трудового законодавства України.',
              'Постійне вдосконалення процесів рекрутингу та аналіз рівності можливостей.',
            ],
          },
          {
            id: 'employee-records-and-ai',
            title: '2.2 Кадрові записи та використання інструментів ШІ',
            content: [
              'У разі прийняття на роботу в Eternal інформація з вашої анкети кандидата стає частиною вашої особової справи співробітника.',
              'Ми можемо застосовувати допоміжні інструменти штучного інтелекту для первинної структуризації резюме. Ви маєте право відмовитися від автоматизованої обробки, повідомивши про це команду найму або нашого Офіцера із захисту даних.',
            ],
          },
        ],
      },
      {
        id: 'how-we-disclose-your-information',
        number: '3',
        title: 'Як ми розкриваємо вашу інформацію',
        iconName: 'Eye',
        tldr: 'Дані передаються лише авторизованим сервісним провайдерам (системи обліку кандидатів, юридичні радники) на основі угод про конфіденційність.',
        subsections: [
          {
            id: 'disclosure-recipients',
            title: '3.1 Авторизовані партнери та провайдери',
            content: [
              'Ваша інформація може передаватися афілійованим особам та постачальникам послуг Eternal (ATS-системи, платформи тестування) виключно в межах зазначених цілей найму та за наявності суворих договірних зобов’язань.',
              'Eternal також може розкривати інформацію державним регуляторним органам відповідно до законодавства України виключно в межах офіційних вимог.',
              'Якщо вас порекомендував чинний працівник Eternal, ми можемо надавати йому базові оновлення щодо етапу розгляду вашої кандидатури.',
            ],
          },
        ],
      },
      {
        id: 'data-retention',
        number: '4',
        title: 'Зберігання даних',
        iconName: 'FileText',
        tldr: 'Дані кандидатів зберігаються протягом періоду найму та до 2 років у базі талантів, після чого видаляються або знеособлюються.',
        subsections: [
          {
            id: 'retention-periods',
            title: '4.1 Строки зберігання',
            content: [
              'Ми зберігаємо ваші персональні дані лише стільки, скільки це необхідно для досягнення цілей підбору персоналу (зазвичай до 2 років для повторного розгляду на майбутні позиції, якщо ви не подасте запит на видалення раніше).',
              'У разі працевлаштування дані переносяться до кадрової системи співробітників відповідно до встановлених законодавством термінів зберігання трудових документів.',
            ],
          },
        ],
      },
      {
        id: 'rights-regarding-personal-information',
        number: '5',
        title: 'Права щодо використання та обробки персональних даних',
        iconName: 'ShieldCheck',
        tldr: 'Ви маєте право на доступ, виправлення, видалення, обмеження обробки, заперечення та перенесення ваших персональних даних.',
        subsections: [
          {
            id: 'candidate-rights-overview',
            title: '5.1 Права суб’єкта персональних даних',
            content: [
              'Відповідно до Закону України «Про захист персональних даних» та міжнародних стандартів (зокрема GDPR), ви маєте такі права:',
              'Право на доступ до своїх персональних даних, внесення змін, виправлення або повне видалення («право бути забутим»). Ви також маєте право на обмеження обробки та перенесення даних в електронному форматі.',
              'Право на заперечення: Ви маєте право будь-коли заперечити проти обробки ваших даних на підставі законного інтересу компанії.',
              'Для реалізації своїх прав напишіть нам на адресу privacy@eternal.com або безпосередньо Офіцеру із захисту даних.',
            ],
          },
          {
            id: 'consent-withdrawal',
            title: '5.2 Відкликання згоди та оскарження',
            content: [
              'Якщо обробка здійснюється на підставі вашої згоди, ви маєте право відкликати її в будь-який момент.',
              'У разі виникнення спорів ви маєте право звернутися зі скаргою до Уповноваженого Верховної Ради України з прав людини або до суду.',
            ],
          },
        ],
      },
      {
        id: 'data-protection-officer',
        number: '6',
        title: 'Офіцер із захисту даних (DPO)',
        iconName: 'Mail',
        tldr: 'Зв’яжіться з нашим Офіцером із захисту даних у м. Київ, Україна щодо будь-яких питань кандидатської конфіденційності.',
        subsections: [
          {
            id: 'dpo-contacts',
            title: '6.1 Контактна інформація',
            content: [
              'Проєктом Eternal в Україні керують Ag Mykola та Ag Mihal. З усіх питань щодо захисту даних кандидатів звертайтеся:',
            ],
            bullets: [
              'Електронна пошта DPO: aghnikolaj1@gmail.com',
              'Юридичний відділ: privacy@eternal.com',
              'Оператори проєкту: Ag Mykola та Ag Mihal, Україна',
            ],
          },
        ],
      },
    ],
  },
};
