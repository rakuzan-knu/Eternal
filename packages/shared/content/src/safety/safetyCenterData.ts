export interface SafetyHubSection {
  heading: string;
  description: string;
  ctaButton: string;
  link: string;
}

export interface SafetyCenterTranslation {
  hero: {
    title: string;
    subtitle: string;
  };
  safetyLibrary: SafetyHubSection;
  privacyHub: SafetyHubSection;
  parentHub: SafetyHubSection;
  transparencyHub: SafetyHubSection;
  safetyNewsHub: SafetyHubSection;
  policyHub: SafetyHubSection;
  teenCharter: SafetyHubSection;
  wellbeingHub: SafetyHubSection;
}

export const SAFETY_CENTER_EN: SafetyCenterTranslation = {
  hero: {
    title: 'ETERNAL SAFETY CENTER',
    subtitle:
      "Eternal is a communication platform built for meaningful connections through voice, video, and text, especially around gaming. Find the resources you need whether you're a teen, parent, educator, or long-time user.",
  },
  safetyLibrary: {
    heading: 'SAFETY LIBRARY',
    description:
      "Everything you could ever want to know about safety on Eternal. Whether you're a user, a moderator, or a parent, discover all of our tools and resources and how to use them.",
    ctaButton: 'Explore More',
    link: '/safety-library',
  },
  privacyHub: {
    heading: 'PRIVACY HUB',
    description:
      "Privacy is an essential part of feeling safe. No matter what, we build privacy into our products and keep you informed about what's happening with your data. Learn more about what that means, including the data we collect and the tools that put you in control.",
    ctaButton: 'Explore More',
    link: '/safety-privacy',
  },
  parentHub: {
    heading: 'PARENT HUB',
    description:
      "Learn more about what we're doing to help your teen stay safer on our platform, explore our Family Center tool, and download our Parent's Guide to Eternal.",
    ctaButton: 'Explore More',
    link: '/safety-family-center',
  },
  transparencyHub: {
    heading: 'TRANSPARENCY HUB',
    description:
      'Explore data, trends, and analysis into the work done to help keep people on Eternal safe. Transparency reports cover information about enforcement of our platform policies, as well as our response to user data and intellectual property requests.',
    ctaButton: 'Explore More',
    link: '/safety-transparency',
  },
  safetyNewsHub: {
    heading: 'SAFETY NEWS HUB',
    description:
      "The latest news and updates on Eternal's Safety, Privacy, and Policy initiatives.",
    ctaButton: 'Explore More',
    link: '/safety-news',
  },
  policyHub: {
    heading: 'POLICY HUB',
    description:
      'Learn about our Community Guidelines, developed to help keep people safe and make Eternal the best place to hang out with friends.',
    ctaButton: 'Explore More',
    link: '/safety-policies',
  },
  teenCharter: {
    heading: 'TEEN CHARTER',
    description:
      'The Teen Charter is a set of principles and commitments crafted alongside young people to promote safety, respect, and positive online behavior.',
    ctaButton: 'Explore More',
    link: '/safety-teen-charter',
  },
  wellbeingHub: {
    heading: 'WELLBEING HUB',
    description:
      'Discover mental health resources, digital wellbeing advice, and support networks to balance your online life and stay emotionally healthy.',
    ctaButton: 'Explore More',
    link: '/safety-wellbeing',
  },
};

export const SAFETY_CENTER_UK: SafetyCenterTranslation = {
  hero: {
    title: 'ЦЕНТР БЕЗПЕКИ ETERNAL',
    subtitle:
      'Eternal — це комунікаційна платформа для щирого спілкування за допомогою голосу, відео та тексту, особливо навколо ігор. Знайдіть усі необхідні ресурси, незалежно від того, чи ви підліток, батько, викладач або постійний користувач.',
  },
  safetyLibrary: {
    heading: 'БІБЛІОТЕКА БЕЗПЕКИ',
    description:
      'Усе, що ви хотіли б знати про безпеку в Eternal. Незалежно від того, чи ви користувач, модератор або батько, відкрийте для себе всі наші інструменти та рекомендації.',
    ctaButton: 'Дізнатися більше',
    link: '/safety-library',
  },
  privacyHub: {
    heading: 'ХАБ ПРИВАТНОСТІ',
    description:
      'Приватність — це фундаментальна основа відчуття захищеності. Ми закладаємо приватність у кожен наш продукт і відкрито розповідаємо про роботу з даними та інструменти контролю.',
    ctaButton: 'Дізнатися більше',
    link: '/safety-privacy',
  },
  parentHub: {
    heading: 'ХАБ ДЛЯ БАТЬКІВ',
    description:
      'Дізнайтеся більше про те, як ми захищаємо підлітків на платформі, користуйтеся інструментами Сімейного центру та завантажуйте посібник для батьків від Eternal.',
    ctaButton: 'Дізнатися більше',
    link: '/safety-family-center',
  },
  transparencyHub: {
    heading: 'ХАБ ПРОЗОРОСТІ',
    description:
      'Досліджуйте дані, тренди та аналітику заходів безпеки в Eternal. Звіти про прозорість містять інформацію про дотримання правил платформи та запити даних.',
    ctaButton: 'Дізнатися більше',
    link: '/safety-transparency',
  },
  safetyNewsHub: {
    heading: 'НОВИНИ БЕЗПЕКИ',
    description: 'Останні новини та оновлення щодо безпеки, приватності та політик Eternal.',
    ctaButton: 'Дізнатися більше',
    link: '/safety-news',
  },
  policyHub: {
    heading: 'ХАБ ПРАВИЛ ТА ПОЛІТИК',
    description:
      'Дізнайтеся про наші Правила спільноти, створені для захисту користувачів та комфортного спілкування з друзями в Eternal.',
    ctaButton: 'Дізнатися більше',
    link: '/safety-policies',
  },
  teenCharter: {
    heading: 'ХАРТІЯ ПІДЛІТКІВ',
    description:
      'Ми прислухаємося до думок молоді під час розробки функцій та правил. Разом із підлітками з усього світу ми створили хартію, яка робить Eternal затишним простором для кожного.',
    ctaButton: 'Дізнатися більше',
    link: '/safety-teen-charter',
  },
  wellbeingHub: {
    heading: 'ХАБ БЛАГОПОЛУЧЧЯ',
    description:
      "Відкрийте ресурси для захисту власного психологічного комфорту та підтримки ментального здоров'я підлітків у мережі.",
    ctaButton: 'Дізнатися більше',
    link: '/safety-wellbeing',
  },
};

export const SAFETY_CENTER_TRANSLATIONS: Record<string, SafetyCenterTranslation> = {
  English: SAFETY_CENTER_EN,
  Українська: SAFETY_CENTER_UK,
  Deutsch: SAFETY_CENTER_EN,
  Español: SAFETY_CENTER_EN,
  Français: SAFETY_CENTER_EN,
};
