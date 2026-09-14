export interface RetentionSubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface RetentionSection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr: string;
  subsections: RetentionSubsection[];
}

export interface RetentionPolicyTranslation {
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
  sections: RetentionSection[];
}

export const RETENTION_POLICY_DATA: Record<'en' | 'uk', RetentionPolicyTranslation> = {
  en: {
    hero: {
      archivedLink: 'Archived Versions',
      title: 'DATA RETENTION POLICY',
      effectiveDate: 'Effective: September 1, 2026 • Last updated: August 30, 2026',
      lastUpdated: 'Last Updated: August 30, 2026',
      description:
        'This Data Retention Policy describes how long Eternal Inc. (headquartered in Kyiv, Ukraine) retains different categories of personal information and content, the legal and operational reasons for our retention timeframes, and how you can manage or delete your data.',
    },
    toc: {
      contents: 'Table of Contents',
      readProgress: '% read',
      print: 'Print Document',
      backToTop: 'Back to top',
    },
    sections: [
      {
        id: 'self-service-deletion',
        number: '1',
        title: 'Information You Can Delete Directly',
        iconName: 'Trash2',
        tldr: 'You can instantly edit or delete your messages, media uploads, channels, and servers at any time while you have access to the space.',
        subsections: [
          {
            id: 'content-deletion-overview',
            title: '1.1 Direct Content Controls',
            content: [
              'You maintain full autonomy to edit or erase content that you generate and post within Eternal:',
            ],
            bullets: [
              'Messages & Posts: You can edit or delete any chat message, thread reply, or media attachment you have sent if you still have access to the corresponding server or direct message channel.',
              'Servers & Spaces: Server owners and administrators can permanently delete entire servers, categories, and channels at any time.',
              'Clearance from Systems: Once you delete content, it becomes immediately unavailable to other users. The content is removed from active server caches within minutes and scheduled for permanent database removal.',
              'Safety Preservation: Public messages flagged for safety violations or subject to mandatory legal preservation orders may be retained for up to 180 days to two years solely to maintain community integrity and train safety detection filters.',
            ],
          },
        ],
      },
      {
        id: 'account-lifetime-data',
        number: '2',
        title: 'Information Retained During Account Lifetime',
        iconName: 'UserCheck',
        tldr: 'We keep your core account profile, username, email, and preferences for as long as your account remains active. Inactive accounts may be purged after 2 years.',
        subsections: [
          {
            id: 'active-account-retention',
            title: '2.1 Core Profile Records & Inactivity Policy',
            content: [
              'We retain core personal data for the active lifespan of your Eternal account in order to deliver uninterrupted services:',
            ],
            bullets: [
              'Account Profile Data: Includes your unique username, display name, registered email address, linked phone number, avatar, and server memberships.',
              'Preferences & Configurations: Theme settings, audio/video input selections, notification preferences, and privacy toggles.',
              'Account Inactivity: You may permanently delete your account at any time via Account Settings. If an account remains completely dormant without login for over two (2) consecutive years, Eternal may schedule it for automated deletion after sending prior notice to your email.',
            ],
          },
        ],
      },
      {
        id: 'specific-retention-periods',
        number: '3',
        title: 'Retention Periods for Specific Business & Legal Purposes',
        iconName: 'Clock',
        tldr: 'Specific timeframes apply to backups (30-45 days), age verification (60 days), accounting (statutory periods), trust/safety (180 days to 2 years), and legal disputes (5 years).',
        subsections: [
          {
            id: 'statutory-and-security-timeframes',
            title: '3.1 Operational Timeframes Schedule',
            content: [
              'To satisfy statutory requirements, protect our community, and maintain continuity, specific categories of data follow predefined retention schedules:',
            ],
            bullets: [
              'Age Verification Records: If you submit government identification to appeal an age restriction, identity documents are permanently purged within sixty (60) days after the appeal ticket is resolved.',
              'Database Backups: Encrypted disaster recovery snapshots are retained on a rolling cycle for thirty to forty-five (30–45) days, after which they are automatically overwritten and purged.',
              'Tax & Financial Accounting: Transaction records, invoice data, and Eternal Premium subscription billing history are retained for statutory periods required by Ukrainian and international tax laws (typically 3 to 7 years).',
              'Trust, Safety & Fraud Prevention: Essential identifying markers (such as email hashes and IP records) associated with accounts banned for severe terms violations (e.g., child safety, harassment, malicious spam) are retained for up to two (2) years to prevent bad actors from creating new accounts.',
              'Legal Claims & Support Logs: Customer support communications, access requests, and formal legal inquiries are retained for five (5) years following ticket closure to establish or defend legal claims.',
              'Continuity of Communication: When an account is deleted, public messages in shared servers remain visible for conversation coherence, but all authorship links are permanently anonymized and detached.',
            ],
          },
        ],
      },
      {
        id: 'account-deletion-lifecycle',
        number: '4',
        title: 'What Happens When You Delete Your Account',
        iconName: 'ShieldAlert',
        tldr: 'Accounts enter a 15-to-30 day recovery grace period, followed by complete anonymization of personal identifiers and backup scrubbing within 45 days.',
        subsections: [
          {
            id: 'deletion-phases',
            title: '4.1 Deletion Lifecycle & Anonymization',
            content: [
              'When you initiate account deletion through your Eternal settings, the following phased process occurs:',
            ],
            bullets: [
              'Phase 1: Grace Period (15–30 Days): Your account is deactivated and hidden from public search. You can log in at any time during this window to cancel deletion if initiated accidentally.',
              'Phase 2: Permanent Identifier Scrubbing: After the grace period expires, our automated pipeline irreversibly deletes your email, phone number, passwords, IP logs, and profile avatars.',
              'Phase 3: Backup Cycle Clearing: Secondary backup snapshots naturally purge all historical traces within forty-five (45) days.',
              'Phase 4: Anonymized Analytics: We retain only aggregated, anonymized metrics that cannot be linked back to you as an individual.',
            ],
          },
        ],
      },
      {
        id: 'rights-and-contacts',
        number: '5',
        title: 'Your Legal Rights & Contact Information',
        iconName: 'Mail',
        tldr: 'You have full rights under GDPR and Ukrainian law to access, rectify, or erase your data. Contact our Data Protection Officer in Kyiv, Ukraine.',
        subsections: [
          {
            id: 'dpo-retention-contacts',
            title: '5.1 Inquiries and Data Subject Requests',
            content: [
              'If you have questions regarding our data retention schedules, need assistance deleting specific historical content, or wish to exercise your rights of access or erasure, please reach out directly:',
            ],
            bullets: [
              'Data Protection Officer (DPO): dpo@eternal.app',
              'Privacy & Legal Department: privacy@eternal.app',
              'Corporate Headquarters: Eternal Inc., Kyiv, Ukraine',
              'Supervisory Inquiries: Secretariat of the Ukrainian Parliament Commissioner for Human Rights or your local European DPA.',
            ],
          },
        ],
      },
    ],
  },
  uk: {
    hero: {
      archivedLink: 'Архівні версії',
      title: 'ПОЛІТИКА ЗБЕРІГАННЯ ТА ВИДАЛЕННЯ ДАНИХ',
      effectiveDate: 'Набуття чинності: 1 вересня 2026 р. • Останнє оновлення: 30 серпня 2026 р.',
      lastUpdated: 'Останнє оновлення: 30 серпня 2026 р.',
      description:
        'Ця Політика зберігання описує строки та підстави збереження різних категорій персональних даних компанією Eternal Inc. (м. Київ, Україна), умови їх автоматичного видалення та інструменти самостійного керування контентом.',
    },
    toc: {
      contents: 'Зміст документа',
      readProgress: '% прочитано',
      print: 'Друк документа',
      backToTop: 'Нагору',
    },
    sections: [
      {
        id: 'self-service-deletion',
        number: '1',
        title: 'Інформація, яку ви можете видалити самостійно',
        iconName: 'Trash2',
        tldr: 'Ви можете в будь-який момент відредагувати або видалити свої повідомлення, вкладення, створені канали та сервери.',
        subsections: [
          {
            id: 'content-deletion-overview',
            title: '1.1 Самостійне видалення контенту',
            content: ['Користувачі Eternal мають повний контроль над створеним контентом:'],
            bullets: [
              'Повідомлення та файли: ви можете видалити будь-яке надіслане повідомлення у чатах, якщо маєте доступ до каналу.',
              'Сервери: власники серверів можуть у будь-який момент безповоротно видалити весь сервер разом з історією.',
              'Очищення систем: видалений контент стає недоступним іншим учасникам і видаляється з активних серверів протягом лічених хвилин.',
              'Захист безпеки: публічні дописи з порушеннями правил можуть зберігатися від 180 днів до 2 років виключно для навчання систем виявлення спаму та загроз.',
            ],
          },
        ],
      },
      {
        id: 'account-lifetime-data',
        number: '2',
        title: 'Інформація, що зберігається протягом дії акаунту',
        iconName: 'UserCheck',
        tldr: 'Основні дані профілю зберігаються, доки ви користуєтеся акаунтом. Неактивні понад 2 роки акаунти можуть бути автоматично видалені.',
        subsections: [
          {
            id: 'active-account-retention',
            title: '2.1 Дані активного облікового запису',
            content: [
              'Ми зберігаємо мінімально необхідні дані для безперебійного функціонування вашого облікового запису:',
            ],
            bullets: [
              'Дані профілю: ім’я користувача, нікнейм, адреса електронної пошти, аватар та список серверів.',
              'Персональні параметри: налаштування теми, мікрофона, сповіщень та безпеки.',
              'Неактивність: якщо акаунт не використовується понад 2 роки, Eternal може видалити його після попереднього сповіщення на e-mail.',
            ],
          },
        ],
      },
      {
        id: 'specific-retention-periods',
        number: '3',
        title: 'Строки зберігання для спеціальних та юридичних цілей',
        iconName: 'Clock',
        tldr: 'Резервні копії зберігаються 30–45 днів, перевірка віку — 60 днів, фінансова звітність — згідно із законом, безпека — до 2 років, спори — 5 років.',
        subsections: [
          {
            id: 'statutory-and-security-timeframes',
            title: '3.1 Графік строків зберігання',
            content: ['Певні категорії інформації зберігаються відповідно до чітких регламентів:'],
            bullets: [
              'Підтвердження віку: документи для верифікації віку безповоротно видаляються протягом 60 днів після закриття запиту.',
              'Резервні копії баз даних: зберігаються в зашифрованому вигляді за 30–45-денним циклом, після чого перезаписуються.',
              'Бухгалтерський та податковий облік: дані транзакцій та оплат зберігаються відповідно до вимог законодавства України (від 3 до 7 років).',
              'Безпека платформи: дані про заблокованих зловмисників зберігаються до 2 років для запобігання повторному створенню акаунтів.',
              'Юридичні претензії: історія звернень до служби підтримки зберігається 5 років для вирішення правових спорів.',
              'Неперервність спілкування: після видалення акаунту надіслані раніше публічні повідомлення знеособлюються та відв’язуються від автора.',
            ],
          },
        ],
      },
      {
        id: 'account-deletion-lifecycle',
        number: '4',
        title: 'Що відбувається під час видалення облікового запису',
        iconName: 'ShieldAlert',
        tldr: 'Після запиту на видалення діє 15–30-денний пільговий період відновлення, після чого персональні дані повністю знеособлюються.',
        subsections: [
          {
            id: 'deletion-phases',
            title: '4.1 Етапи процедури видалення',
            content: [
              'Процедура видалення облікового запису складається з кількох послідовних етапів:',
            ],
            bullets: [
              'Етап 1 (Пільговий період 15–30 днів): акаунт приховується, але ви можете відновити його, увійшовши до системи.',
              'Етап 2 (Незворотне очищення): система остаточно видаляє e-mail, телефон, паролі та персональні ідентифікатори.',
              'Етап 3 (Очищення бекапів): повне видалення з резервних копій відбувається протягом 45 днів.',
              'Етап 4 (Знеособлена аналітика): залишаються лише загальні агреговані показники без прив’язки до особи.',
            ],
          },
        ],
      },
      {
        id: 'rights-and-contacts',
        number: '5',
        title: 'Ваші права та контакти',
        iconName: 'Mail',
        tldr: 'Ви маєте право на доступ, виправлення та повне видалення своїх даних. Звертайтеся до нашого Офіцера із захисту даних у м. Київ, Україна.',
        subsections: [
          {
            id: 'dpo-retention-contacts',
            title: '5.1 Контактна інформація',
            content: [
              'З усіх питань щодо строків зберігання та видалення персональних даних звертайтеся:',
            ],
            bullets: [
              'Офіцер із захисту даних (DPO): dpo@eternal.app',
              'Юридичний департамент: privacy@eternal.app',
              'Головний офіс: Eternal Inc., м. Київ, Україна',
              'Секретаріат Уповноваженого ВРУ з прав людини: hotline@ombudsman.gov.ua',
            ],
          },
        ],
      },
    ],
  },
};
