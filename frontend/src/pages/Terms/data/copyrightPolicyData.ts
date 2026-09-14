export interface CopyrightSubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface CopyrightSection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr: string;
  subsections: CopyrightSubsection[];
}

export interface CopyrightPolicyTranslation {
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
  sections: CopyrightSection[];
}

export const COPYRIGHT_POLICY_DATA: Record<'en' | 'uk', CopyrightPolicyTranslation> = {
  en: {
    hero: {
      archivedLink: 'Safety & Legal Policies',
      title: 'DMCA & COPYRIGHT POLICY',
      effectiveDate: 'Effective: September 1, 2026 • Last updated: August 30, 2026',
      lastUpdated: 'Last Updated: August 30, 2026',
      description:
        'Eternal Inc. respects the intellectual property rights of creators and copyright holders. This policy outlines our procedures for submitting copyright takedown notices under the Digital Millennium Copyright Act (DMCA 17 U.S.C. § 512) and the EU Digital Services Act (DSA Art. 16), as well as filing counter-notifications and our repeat infringer policy.',
    },
    toc: {
      contents: 'Table of Contents',
      readProgress: '% read',
      print: 'Print Document',
      backToTop: 'Back to top',
    },
    sections: [
      {
        id: 'copyright-overview',
        number: '1',
        title: 'Overview & Safe Harbor Commitment',
        iconName: 'ShieldCheck',
        tldr: 'Eternal promptly responds to valid copyright infringement notices and maintains statutory Safe Harbor compliance under the DMCA and EU DSA.',
        subsections: [
          {
            id: 'commitment',
            title: '1.1 Our Respect for Intellectual Property',
            content: [
              'Eternal provides a multi-dimensional social matrix enabling users to share photos, video reels, stories, and voice hangouts. We respect all intellectual property rights and prohibit users from uploading, publishing, or transmitting content that infringes any copyright, trademark, or proprietary right of third parties.',
              'Pursuant to Title II of the Digital Millennium Copyright Act (17 U.S.C. § 512) and Article 16 of the EU Digital Services Act, Eternal maintains an expeditious Notice-and-Takedown process to address claims of unauthorized content.',
            ],
          },
        ],
      },
      {
        id: 'designated-agent',
        number: '2',
        title: 'Designated Copyright Agent Contact',
        iconName: 'Mail',
        tldr: 'Formal copyright infringement notices and counter-notices should be submitted to our Designated DMCA Agent at copyright@eternal.app.',
        subsections: [
          {
            id: 'agent-details',
            title: '2.1 Designated Agent Details',
            content: [
              'Please send all formal DMCA notices, trademark infringement reports, and counter-notices to our designated compliance officer:',
            ],
            bullets: [
              'Designated Agent: DMCA Copyright Compliance Officer',
              'Organization: Eternal Inc.',
              'Physical Address: Kyiv, Ukraine',
              'Email: copyright@eternal.app',
              'Legal & Inquiries: legal@eternal.app',
            ],
          },
        ],
      },
      {
        id: 'takedown-notice-requirements',
        number: '3',
        title: 'Submitting a DMCA Takedown Notice',
        iconName: 'FileText',
        tldr: 'Valid takedown notices must include 6 statutory elements including work identification, precise URLs, contact info, and good-faith statements under penalty of perjury.',
        subsections: [
          {
            id: 'statutory-elements',
            title: '3.1 Mandatory Notice Requirements (17 U.S.C. § 512(c)(3))',
            content: [
              'To ensure prompt action, your written notification must include substantially the following information:',
            ],
            bullets: [
              '1. A physical or electronic signature of the copyright owner or a person authorized to act on their behalf.',
              '2. Identification of the copyrighted work claimed to have been infringed (e.g., original photo, video link, or registration number).',
              '3. Identification of the material that is claimed to be infringing, with sufficiently specific location information (such as the exact post URL or profile username on Eternal).',
              '4. Your complete contact details, including full legal name, physical mailing address, telephone number, and email address.',
              '5. A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.',
              '6. A statement that the information in the notification is accurate, and under penalty of perjury, that you are authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.',
            ],
          },
        ],
      },
      {
        id: 'counter-notice-procedure',
        number: '4',
        title: 'Counter-Notification & Content Restoration',
        iconName: 'RefreshCw',
        tldr: 'If your content was removed by mistake or misidentification, you can submit a counter-notice. Restorations occur within 10–14 business days unless legal action is filed.',
        subsections: [
          {
            id: 'counter-notice-rules',
            title: '4.1 Submitting a Counter-Notification (17 U.S.C. § 512(g)(3))',
            content: [
              'If you believe that your content was removed or disabled as a result of mistake or misidentification (such as fair use, public domain, or valid license), you may send a written counter-notification to copyright@eternal.app containing:',
            ],
            bullets: [
              '1. Your physical or electronic signature.',
              '2. Identification of the material that has been removed or disabled and the location where it previously appeared.',
              '3. A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification.',
              '4. Your name, address, telephone number, and a statement that you consent to the jurisdiction of the federal court or competent tribunal in your jurisdiction, and that you will accept service of process from the complainant.',
            ],
          },
          {
            id: 'restoration-timeline',
            title: '4.2 Restoration Timeline',
            content: [
              'Upon receipt of a valid counter-notification, Eternal will promptly forward a copy to the original complaining party.',
              'Unless the copyright owner notifies us within ten to fourteen (10–14) business days that they have filed a court action seeking an injunction against the infringing activity, Eternal will restore the removed content.',
            ],
          },
        ],
      },
      {
        id: 'repeat-infringer-policy',
        number: '5',
        title: 'Repeat Infringer Policy (Three-Strike Rule)',
        iconName: 'ShieldAlert',
        tldr: 'Eternal enforces a strict repeat infringer policy and permanently terminates accounts that repeatedly upload infringing media.',
        subsections: [
          {
            id: 'repeat-policy-enforcement',
            title: '5.1 Account Termination for Repeat Violators',
            content: [
              'In accordance with the DMCA and applicable laws, Eternal enforces an automated and human-reviewed "three-strike" policy for repeat copyright infringers.',
              'Accounts that receive multiple validated copyright takedown notices without successful counter-notifications will have their posting privileges revoked and their accounts permanently terminated.',
            ],
          },
        ],
      },
      {
        id: 'reels-audio-and-fair-use',
        number: '6',
        title: 'Reels Audio, Fair Use & Liability Disclaimers',
        iconName: 'Music',
        tldr: 'Users must possess valid rights for audio in Reels and videos. Submitting fraudulent or bad-faith DMCA claims incurs statutory damages.',
        subsections: [
          {
            id: 'ugc-audio',
            title: '6.1 Background Audio & Video Tracks',
            content: [
              'When uploading video reels or stories with audio, you must ensure you have appropriate rights or that your use qualifies under applicable fair use doctrines.',
              'If a recognized music publisher or copyright holder requests muting or removal of a specific audio track, Eternal may automatically replace the audio stream with silence while keeping your video intact.',
            ],
          },
          {
            id: 'bad-faith-claims',
            title: '6.2 Liability for Fraudulent Claims (17 U.S.C. § 512(f))',
            content: [
              'Please note that under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material is infringing or was removed by mistake may be liable for monetary damages, including court costs and attorneys’ fees.',
            ],
          },
        ],
      },
    ],
  },
  uk: {
    hero: {
      archivedLink: 'Політики та правові норми',
      title: 'ПОЛІТИКА ЗАХИСТУ АВТОРСЬКИХ ПРАВ (DMCA)',
      effectiveDate: 'Набуття чинності: 1 вересня 2026 р. • Останнє оновлення: 30 серпня 2026 р.',
      lastUpdated: 'Останнє оновлення: 30 серпня 2026 р.',
      description:
        'Eternal Inc. поважає інтелектуальну власність авторів. Ця політика регулює процедуру подання повідомлень про порушення авторських прав згідно з DMCA (17 U.S.C. § 512), Законом ЄС про цифрові послуги (DSA Art. 16) та законодавством України, а також подання зустрічних повідомлень і політику повторних порушників.',
    },
    toc: {
      contents: 'Зміст документа',
      readProgress: '% прочитано',
      print: 'Друк політики',
      backToTop: 'Нагору',
    },
    sections: [
      {
        id: 'copyright-overview',
        number: '1',
        title: 'Загальні положення та Safe Harbor',
        iconName: 'ShieldCheck',
        tldr: 'Eternal оперативно розглядає скарги правовласників та дотримується принципів безпечної гавані (Safe Harbor).',
        subsections: [
          {
            id: 'commitment',
            title: '1.1 Захист інтелектуальної власності',
            content: [
              'Eternal — це соціальна мережа для обміну фотографіями, рілсами, історіями та голосовими кімнатами. Ми категорично забороняємо публікацію матеріалів, які порушують авторські чи суміжні права третіх осіб.',
              'Відповідно до розділу 512 DMCA та ст. 16 EU Digital Services Act, платформа забезпечує швидку процедуру розгляду та видалення неправомірного контенту (Notice-and-Takedown).',
            ],
          },
        ],
      },
      {
        id: 'designated-agent',
        number: '2',
        title: 'Контакти уповноваженого агента з авторських прав',
        iconName: 'Mail',
        tldr: 'Офіційні скарги та зустрічні повідомлення слід надсилати на copyright@eternal.app.',
        subsections: [
          {
            id: 'agent-details',
            title: '2.1 Контактні реквізити',
            content: ['Офіційні звернення правовласників приймаються уповноваженим представником:'],
            bullets: [
              'Уповноважена особа: Уповноважений агент з авторських прав (DMCA Compliance Officer)',
              'Організація: Eternal Inc.',
              'Місцезнаходження: м. Київ, Україна',
              'E-mail для скарг: copyright@eternal.app',
              'Юридичний відділ: legal@eternal.app',
            ],
          },
        ],
      },
      {
        id: 'takedown-notice-requirements',
        number: '3',
        title: 'Вимоги до оформлення скарги DMCA',
        iconName: 'FileText',
        tldr: 'Скарга має містити точні посилання на оригінал та порушення, контакти заявника та офіційне підтвердження добросовісності.',
        subsections: [
          {
            id: 'statutory-elements',
            title: '3.1 Обов’язкові реквізити повідомлення',
            content: ['Для розгляду скарги необхідно надати таку інформацію:'],
            bullets: [
              '1. Фізичний або електронний підпис правовласника чи уповноваженого представника.',
              '2. Опис оригінального твору, права на який порушено (посилання на оригінал або свідоцтво реєстрації).',
              '3. Точні прямі посилання (URL) на оскаржуваний контент або профіль в Eternal.',
              '4. Контактні дані: повне ім’я, поштова адреса, телефон та email.',
              '5. Заяву про добросовісне переконання (Good Faith Belief), що використання не дозволено автором.',
              '6. Заяву під присягою про точність наданої інформації та наявність повноважень.',
            ],
          },
        ],
      },
      {
        id: 'counter-notice-procedure',
        number: '4',
        title: 'Зустрічне повідомлення та відновлення контенту',
        iconName: 'RefreshCw',
        tldr: 'Якщо контент видалено помилково, ви можете подати зустрічне повідомлення. Відновлення відбувається за 10–14 робочих днів.',
        subsections: [
          {
            id: 'counter-notice-rules',
            title: '4.1 Порядок подання зустрічного повідомлення',
            content: [
              'Якщо ваш пост або рілс було видалено помилково або на підставі добросовісного використання (Fair Use), надішліть листа на copyright@eternal.app з підписом, посиланням на матеріал та заявою про згоду на юрисдикцію суду.',
            ],
          },
          {
            id: 'restoration-timeline',
            title: '4.2 Терміни відновлення',
            content: [
              'Після отримання зустрічного повідомлення ми передаємо його автору первинної скарги. Якщо протягом 10–14 робочих днів правовласник не надасть підтвердження судового позову, контент буде автоматично відновлено.',
            ],
          },
        ],
      },
      {
        id: 'repeat-infringer-policy',
        number: '5',
        title: 'Політика щодо повторних порушників',
        iconName: 'ShieldAlert',
        tldr: 'Профілі, які систематично порушують авторські права, безповоротно блокуються (правило трьох попереджень).',
        subsections: [
          {
            id: 'repeat-policy-enforcement',
            title: '5.1 Блокування акаунтів',
            content: [
              'Eternal застосовує систему попереджень: акаунти користувачів, які неодноразово отримують обґрунтовані скарги на порушення копірайту, підлягають остаточному видаленню без права відновлення.',
            ],
          },
        ],
      },
      {
        id: 'reels-audio-and-fair-use',
        number: '6',
        title: 'Аудіодоріжки в Рілсах та відповідальність',
        iconName: 'Music',
        tldr: 'Користувач несе відповідальність за музику у відео. Завідомо неправдиві скарги DMCA тягнуть майнову відповідальність.',
        subsections: [
          {
            id: 'ugc-audio',
            title: '6.1 Музика у відео та історіях',
            content: [
              'При публікації відео переконайтеся у наявності прав на звуковий супровід. У разі отримання скарги від музичного лейбла звук у відео може бути вимкнено зі збереженням самого відеоряду.',
            ],
          },
          {
            id: 'bad-faith-claims',
            title: '6.2 Відповідальність за зловживання',
            content: [
              'Подання неправдивих скарг про порушення авторських прав тягне за собою обов’язок відшкодування збитків і судових витрат відповідно до законодавства.',
            ],
          },
        ],
      },
    ],
  },
};
