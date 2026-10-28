export interface PolicyExplainerItem {
  id: string;
  category: 'user-safety' | 'platform-integrity' | 'regulated' | 'other';
  categoryLabel: string;
  title: string;
  summary: string;
  details: string[];
  colorTheme: 'purple' | 'emerald' | 'indigo' | 'amber' | 'rose';
}

export interface PolicyHubTranslation {
  hero: {
    title: string;
    subtitle: string;
    ctaButton: string;
    ctaLink: string;
  };
  explainersSection: {
    title: string;
    subtitle: string;
    filterLabels: {
      all: string;
      userSafety: string;
      platformIntegrity: string;
      regulated: string;
      other: string;
    };
    loadMore: string;
    showLess: string;
    modalClose: string;
    keyTakeawaysTitle: string;
    reportViolationBtn: string;
  };
  items: PolicyExplainerItem[];
}

export const POLICY_HUB_EN: PolicyHubTranslation = {
  hero: {
    title: 'ETERNAL POLICY HUB',
    subtitle:
      'Learn about our Community Guidelines, developed to help keep people safe and make Eternal the best place to hang out with friends.',
    ctaButton: 'Community Guidelines',
    ctaLink: '/guidelines',
  },
  explainersSection: {
    title: 'POLICY EXPLAINERS',
    subtitle:
      'Deep dives into how we interpret and enforce our platform rules, safety commitments, and trust architecture.',
    filterLabels: {
      all: 'All',
      userSafety: 'User Safety',
      platformIntegrity: 'Platform Integrity',
      regulated: 'Regulated or Illegal Activities',
      other: 'Other',
    },
    loadMore: 'Load More',
    showLess: 'Show Less',
    modalClose: 'Close Explainer',
    keyTakeawaysTitle: 'Key Policy Tenets & Enforcement Rules',
    reportViolationBtn: 'Report a Violation',
  },
  items: [
    {
      id: 'violent-extremism',
      category: 'user-safety',
      categoryLabel: 'User Safety',
      title: 'Violent Extremism Policy Explainer',
      summary:
        'Understanding our zero-tolerance stance towards violent extremism, hate mobilization, terror networks, and dangerous organizations.',
      details: [
        'Eternal maintains zero tolerance for groups or individuals promoting violent extremism, radicalization, or terrorist manifestos.',
        'We actively cooperate with international trust coalitions and government CERTs to identify and permanently disband extremist cells.',
        'Glorifying violent attacks, organizing hate marches, or recruiting members for militant armed groups results in immediate account and server termination.',
      ],
      colorTheme: 'rose',
    },
    {
      id: 'violence-graphic',
      category: 'user-safety',
      categoryLabel: 'User Safety',
      title: 'Violence and Graphic Content Policy Explainer',
      summary:
        'Guidelines on depictions of real-world gore, gratuitous violence, animal abuse, and automated sensitive media blurring filters.',
      details: [
        'Sharing non-consensual graphic violence, executions, severe bodily mutilation, or real-world gore is strictly forbidden.',
        'Depictions of animal abuse, animal fighting, or torture will result in permanent platform ban and potential referral to authorities.',
        'News reporting and educational content discussing sensitive topics must be properly tagged with spoiler warnings and age-gated channels.',
      ],
      colorTheme: 'purple',
    },
    {
      id: 'copyright-access',
      category: 'regulated',
      categoryLabel: 'Regulated or Illegal Activities',
      title: 'Unauthorized Copyright Access Policy Explainer',
      summary:
        'How Eternal complies with intellectual property laws, DMCA takedown procedures, pirated streams, and software crack distribution rules.',
      details: [
        'Distributing cracked games, unauthorized software license keys, or pirated media torrents violates copyright integrity.',
        'Hosting servers dedicated to streaming pay-per-view events or premium copyrighted television without authorization is strictly prohibited.',
        'We adhere to standard DMCA notification processes and enforce a repeat infringer policy leading to account closure.',
      ],
      colorTheme: 'indigo',
    },
    {
      id: 'misinformation',
      category: 'platform-integrity',
      categoryLabel: 'Platform Integrity',
      title: 'Misinformation Policy Explainer',
      summary:
        'Our policies regarding public health disinformation, election interference, generative AI deepfakes, and coordinated inauthentic campaigns.',
      details: [
        'Manipulated media, synthetic deepfakes, and false medical advice that poses an imminent threat to human health or public safety are prohibited.',
        'We restrict coordinated networks attempting to suppress democratic voter turnout or propagate fraudulent civic guidance.',
        'Satire and parody are permitted when clearly contextualized and not intended to deceive audiences maliciously.',
      ],
      colorTheme: 'emerald',
    },
    {
      id: 'identity-authenticity',
      category: 'platform-integrity',
      categoryLabel: 'Platform Integrity',
      title: 'Identity and Authenticity Policy Explainer',
      summary:
        'Preventing deceptive account impersonation, malicious clone bots, brand phishing, and misleading server masquerading.',
      details: [
        'Impersonating public figures, community members, or Eternal staff to defraud or harass others will result in immediate suspension.',
        'Server owners must not misleadingly mimic official government agencies, verified brand accounts, or system moderation bots.',
        'Fan clubs, archive accounts, and parody projects must clearly indicate their unofficial status in their profile and server descriptions.',
      ],
      colorTheme: 'amber',
    },
    {
      id: 'human-trafficking',
      category: 'regulated',
      categoryLabel: 'Regulated or Illegal Activities',
      title: 'Human Trafficking Policy Explainer',
      summary:
        'Comprehensive overview of strict prevention mechanisms, victim protection measures, and immediate law enforcement reporting.',
      details: [
        'Eternal is committed to eradicating any facilitation of human trafficking, forced labor, or sexual exploitation across all servers.',
        'We partner with international anti-trafficking agencies and provide immediate triage and law enforcement escalations for reported cases.',
        'Any advertisement, recruitment, or coordination of human trafficking leads to immediate IP-level bans and forensic evidence preservation.',
      ],
      colorTheme: 'rose',
    },
    {
      id: 'child-safety',
      category: 'user-safety',
      categoryLabel: 'User Safety',
      title: 'Child Safety and Exploitation Policy Explainer',
      summary:
        'Our proactive measures, NCMEC hash-sharing integrations, AI filter pipelines, and absolute zero tolerance for youth endangerment.',
      details: [
        'We maintain a strict zero-tolerance policy towards child sexual abuse material (CSAM) and child grooming behavior.',
        'Automated scanning utilizing industry-standard PhotoDNA and hash matching flags illicit content prior to distribution.',
        'All incidents involving youth exploitation are immediately reported to the National Center for Missing & Exploited Children (NCMEC) and local law enforcement.',
      ],
      colorTheme: 'purple',
    },
    {
      id: 'harassment-bullying',
      category: 'user-safety',
      categoryLabel: 'User Safety',
      title: 'Harassment and Bullying Policy Explainer',
      summary:
        'Distinguishing between friendly banter and malicious targeted harassment, doxxing, coordinated dogpiling, and raid brigades.',
      details: [
        'Targeted harassment, recurring unwanted contact across multiple accounts, and cyberbullying are strictly prohibited.',
        'Publishing private personally identifiable information (doxxing), home addresses, or phone numbers will trigger immediate account ban.',
        'Organizing server raids or brigade mobs to spam and disrupt other communities is a severe violation of community guidelines.',
      ],
      colorTheme: 'indigo',
    },
    {
      id: 'hate-speech',
      category: 'user-safety',
      categoryLabel: 'User Safety',
      title: 'Hate Speech and Discriminatory Behavior Policy Explainer',
      summary:
        'Protecting users against dehumanizing speech, hate symbols, and systemic discrimination based on protected identity attributes.',
      details: [
        'Attacking, dehumanizing, or inciting hatred against individuals based on race, ethnicity, religion, sexual orientation, gender, disability, or nationality is forbidden.',
        'Displaying recognized Nazi, white supremacist, or terrorist symbols and manifestos is prohibited in all public and private spaces.',
        'We empower server moderators with proactive automod filters to prevent toxic slurs and hostile language.',
      ],
      colorTheme: 'rose',
    },
    {
      id: 'self-harm',
      category: 'user-safety',
      categoryLabel: 'User Safety',
      title: 'Self-Harm and Suicide Prevention Policy Explainer',
      summary:
        'Providing compassionate intervention resources, crisis hotline integrations, and prohibiting the encouragement of self-injury.',
      details: [
        'Encouraging, instructing, or glorifying self-harm, eating disorders, or suicide is completely forbidden on Eternal.',
        'When users express distress, our safety system displays localized crisis helpline numbers and mental health support resources.',
        'We support constructive recovery communities that emphasize wellness, healing, and professional mental healthcare.',
      ],
      colorTheme: 'amber',
    },
    {
      id: 'spam-scams',
      category: 'platform-integrity',
      categoryLabel: 'Platform Integrity',
      title: 'Spam, Scams, and Account Theft Policy Explainer',
      summary:
        'Defending accounts against Eternal Premium gift phishing, session token logging, automated spam bots, and crypto pump-and-dump fraud.',
      details: [
        'Sending automated bulk direct messages, promotional spam, or mass invite links will result in automated account quarantine.',
        'Hosting fake login portals, malicious OAuth applications, or token-stealing payloads is permanently penalized.',
        'Unregulated financial schemes, crypto investment pyramids, and deceptive giveaways are banned from our platform.',
      ],
      colorTheme: 'emerald',
    },
    {
      id: 'financial-crimes',
      category: 'regulated',
      categoryLabel: 'Regulated or Illegal Activities',
      title: 'Financial Crimes and Dangerous Goods Policy Explainer',
      summary:
        'Enforcing restrictions on illegal weapons sales, controlled narcotics, illicit carding, stolen goods, and unregulated gambling.',
      details: [
        'Facilitating the commercial exchange of illegal firearms, explosives, 3D gun blueprints, or regulated contraband is prohibited.',
        'Selling or distributing prescription narcotics, illegal drugs, or counterfeit pharmaceutical products is strictly forbidden.',
        'Credit card fraud (carding), bank account dumps, and selling stolen digital accounts will result in immediate law enforcement escalation.',
      ],
      colorTheme: 'indigo',
    },
  ],
};

export const POLICY_HUB_UK: PolicyHubTranslation = {
  hero: {
    title: 'ХАБ ПРАВИЛ ТА ПОЛІТИК ETERNAL',
    subtitle:
      'Дізнайтеся більше про наші Правила спільноти, створені для забезпечення безпеки користувачів та комфортного спілкування з друзями в Eternal.',
    ctaButton: 'Правила спільноти',
    ctaLink: '/guidelines',
  },
  explainersSection: {
    title: 'ПОЯСНЕННЯ НАШИХ ПОЛІТИК',
    subtitle:
      'Детальний розбір того, як ми інтерпретуємо та впроваджуємо правила платформи, зобов’язання щодо безпеки та захисту довіри.',
    filterLabels: {
      all: 'Всі',
      userSafety: 'Безпека користувачів',
      platformIntegrity: 'Цілісність платформи',
      regulated: 'Регульовані або незаконні дії',
      other: 'Інше',
    },
    loadMore: 'Показати більше',
    showLess: 'Згорнути',
    modalClose: 'Закрити пояснення',
    keyTakeawaysTitle: 'Ключові принципи та правила застосування',
    reportViolationBtn: 'Повідомити про порушення',
  },
  items: [
    {
      id: 'violent-extremism',
      category: 'user-safety',
      categoryLabel: 'Безпека користувачів',
      title: 'Пояснення політики: Насильницький екстремізм',
      summary:
        'Наша позиція абсолютної нетерпимості до насильницького екстремізму, мобілізації ненависті, терористичних мереж та небезпечних угруповань.',
      details: [
        'Eternal дотримується політики нульової толерантності до організацій чи осіб, які просувають насильницький екстремізм або радикалізацію.',
        'Ми активно співпрацюємо з міжнародними коаліціями та CERT для виявлення та блокування екстремістських осередків.',
        'Прославлення терактів, заклики до насильницьких дій або рекрутинг до збройних угруповань призводять до негайного бану акаунта та сервера.',
      ],
      colorTheme: 'rose',
    },
    {
      id: 'violence-graphic',
      category: 'user-safety',
      categoryLabel: 'Безпека користувачів',
      title: 'Пояснення політики: Насильство та шокуючий контент',
      summary:
        'Правила щодо публікації реального насильства, каліцтв, жорстокого поводження з тваринами та робота фільтрів розмиття контенту.',
      details: [
        'Поширення контенту із насильницькими діями, стратами або тяжкими тілесними ушкодженнями суворо заборонено.',
        'Жорстоке поводження з тваринами або тортури призводять до довічного бану на платформі та передачі даних правоохоронцям.',
        'Новинний або освітній контент на чутливі теми повинен обов’язково супроводжуватися позначками спойлерів та публікуватися у вікових каналах.',
      ],
      colorTheme: 'purple',
    },
    {
      id: 'copyright-access',
      category: 'regulated',
      categoryLabel: 'Регульовані або незаконні дії',
      title: 'Пояснення політики: Несанкціонований доступ до авторського права',
      summary:
        'Як Eternal дотримується законодавства про інтелектуальну власність, процедур DMCA, блокування піратських трансляцій та кряків.',
      details: [
        'Розповсюдження зламаних ігор, неліцензійних ключів або піратських торентів є прямим порушенням авторських прав.',
        'Хостинг серверів, призначених для нелегального ретранслювання платних трансляцій або медіаконтенту, суворо заборонено.',
        'Ми дотримуємося вимог DMCA та застосовуємо блокування акаунтів для систематичних порушників.',
      ],
      colorTheme: 'indigo',
    },
    {
      id: 'misinformation',
      category: 'platform-integrity',
      categoryLabel: 'Цілісність платформи',
      title: 'Пояснення політики: Дезінформація',
      summary:
        'Правила щодо неправдивої медичної інформації, втручання у виборчий процес, генеративних дипфейків та скоординованих кампаній.',
      details: [
        'Маніпулятивні медіаматеріали, дипфейки та неправдиві медичні поради, що становлять загрозу здоров’ю або громадській безпеці, заборонені.',
        'Ми блокуємо скоординовані мережі, спрямовані на зрив демократичних виборів або публікацію оманливих інструкцій для громадян.',
        'Сатира та пародія дозволені за умови ясного контексту і відсутності наміру ввести користувачів в оману.',
      ],
      colorTheme: 'emerald',
    },
    {
      id: 'identity-authenticity',
      category: 'platform-integrity',
      categoryLabel: 'Цілісність платформи',
      title: 'Пояснення політики: Автентичність та видача себе за іншу особу',
      summary:
        'Запобігання оманливому копіюванню профілів, створенню шкідливих ботів-клонів, фішингу та маскуванню під офіційні бренди.',
      details: [
        'Видача себе за відомих осіб, учасників спільноти або співробітників Eternal з метою шахрайства карається баном.',
        'Власники серверів не мають права маскувати сервери під офіційні державні органи чи перевірені бренди.',
        'Фан-клуби та пародійні проєкти повинні чітко зазначати свій неофіційний статус у профілі та описі спільноти.',
      ],
      colorTheme: 'amber',
    },
    {
      id: 'human-trafficking',
      category: 'regulated',
      categoryLabel: 'Регульовані або незаконні дії',
      title: 'Пояснення політики: Торгівля людьми',
      summary:
        'Огляд механізмів запобігання експлуатації, захисту постраждалих та негайної передачі даних до правоохоронних органів.',
      details: [
        'Eternal виступає проти будь-яких проявів торгівлі людьми, примусової праці чи сексуальної експлуатації.',
        'Ми співпрацюємо з міжнародними організаціями та забезпечуємо екстрене реагування на будь-які підозрілі сигнали.',
        'Будь-яка реклама або вербування призводять до негайного бану за IP та збереження доказової бази.',
      ],
      colorTheme: 'rose',
    },
    {
      id: 'child-safety',
      category: 'user-safety',
      categoryLabel: 'Безпека користувачів',
      title: 'Пояснення політики: Безпека дітей та захист від експлуатації',
      summary:
        'Наші проактивні заходи, інтеграція з базами NCMEC, ШІ-фільтри та абсолютна нетерпимість до загрози неповнолітнім.',
      details: [
        'Ми дотримуємося безкомпромісної політики нульової толерантності до матеріалів сексуального насильства над дітьми (CSAM) та грумінгу.',
        'Автоматизовані сканери PhotoDNA та хеш-порівняння блокують заборонений контент ще до його поширення.',
        'Усі інциденти негайно передаються до Національного центру зниклих та експлуатованих дітей (NCMEC) та поліції.',
      ],
      colorTheme: 'purple',
    },
    {
      id: 'harassment-bullying',
      category: 'user-safety',
      categoryLabel: 'Безпека користувачів',
      title: 'Пояснення політики: Переслідування та булінг',
      summary:
        'Розмежування дружніх жартів та цілеспрямованого цькування, доксингу, скоординованих набігів і рейдів.',
      details: [
        'Цілеспрямоване цькування, небажані переслідування та кібербулінг суворо заборонені.',
        'Публікація персональних конфіденційних даних (доксинг), адрес чи номерів телефонів карається миттєвим баном.',
        'Організація набігів (рейдів) на інші спільноти для спаму чи образ є грубим порушенням правил Eternal.',
      ],
      colorTheme: 'indigo',
    },
    {
      id: 'hate-speech',
      category: 'user-safety',
      categoryLabel: 'Безпека користувачів',
      title: 'Пояснення політики: Мова ворожнечі та дискримінація',
      summary:
        'Захист користувачів від образливої риторики, символів ненависті та дискримінації за захищеними ознаками.',
      details: [
        'Напади, приниження чи розпалювання ненависті за ознакою раси, релігії, сексуальної орієнтації, статі чи національності заборонені.',
        'Демонстрація нацистської символіки чи маніфестів терористів неприпустима в усіх публічних та приватних чатах.',
        'Ми надаємо адміністраторам серверів зручні автоматичні фільтри для запобігання токсичній лексиці.',
      ],
      colorTheme: 'rose',
    },
    {
      id: 'self-harm',
      category: 'user-safety',
      categoryLabel: 'Безпека користувачів',
      title: 'Пояснення політики: Самоушкодження та суїцид',
      summary:
        'Надання ресурсів психологічної допомоги, гарячих ліній та заборона заохочення до завдання шкоди собі.',
      details: [
        'Заохочення, інструктаж або пропаганда самоушкодження чи суїциду категорично заборонені на Eternal.',
        'Коли система фіксує ознаки кризового стану, користувачеві пропонуються контакти перевірених гарячих ліній допомоги.',
        'Ми підтримуємо спільноти взаємодопомоги, орієнтовані на одужання та професійну підтримку ментального здоров’я.',
      ],
      colorTheme: 'amber',
    },
    {
      id: 'spam-scams',
      category: 'platform-integrity',
      categoryLabel: 'Цілісність платформи',
      title: 'Пояснення політики: Спам, шахрайство та крадіжка акаунтів',
      summary:
        'Захист акаунтів від фішингу під виглядом подарунків Eternal Premium, крадіжки токенів, спам-ботів та криптовалютних афер.',
      details: [
        'Масова розсилка спаму в особисті повідомлення або автоматизовані запрошення призводять до блокування профілю.',
        'Створення фейкових сторінок входу, шкідливих додатків або вірусів для крадіжки токенів карається довічним баном.',
        'Нерегульовані фінансові піраміди, криптошахрайства та сумнівні розіграші заборонені на платформі.',
      ],
      colorTheme: 'emerald',
    },
    {
      id: 'financial-crimes',
      category: 'regulated',
      categoryLabel: 'Регульовані або незаконні дії',
      title: 'Пояснення політики: Фінансові злочини та заборонені товари',
      summary:
        'Обмеження щодо продажу зброї, заборонених речовин, крадених банківських даних та нелегального гемблінгу.',
      details: [
        'Торгівля вогнепальною зброєю, вибухівкою, кресленнями для 3D-друку зброї чи контрабандою суворо заборонена.',
        'Поширення та продаж наркотичних або рецептурних препаратів карається миттєвою ліквідацією акаунта.',
        'Кардинг, торгівля базами банківських карток та краденими обліковими записами передаються до правоохоронних органів.',
      ],
      colorTheme: 'indigo',
    },
  ],
};
