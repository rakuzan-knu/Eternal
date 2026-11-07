export interface PaidServicesSubsection {
  id: string;
  title: string;
  content: string[];
  bullets?: string[];
}

export interface PaidServicesSection {
  id: string;
  number: string;
  title: string;
  iconName: string;
  tldr: string;
  subsections: PaidServicesSubsection[];
}

export interface PaidServicesTranslation {
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
  sections: PaidServicesSection[];
}

export const PAID_SERVICES_DATA: Record<'en' | 'uk', PaidServicesTranslation> = {
  en: {
    hero: {
      archivedLink: 'Paid Services',
      title: 'PAID SERVICES & REFUND POLICY',
      effectiveDate: 'Updated: November 5, 2026',
      lastUpdated: 'Updated: November 5, 2026',
      description:
        'Eternal is currently free. This notice explains the absence of paid offers and preserves applicable consumer rights.',
    },
    toc: {
      contents: 'Table of Contents',
      readProgress: '% read',
      print: 'Print Document',
      backToTop: 'Back to top',
    },
    sections: [
      {
        id: 'paid-services-overview',
        number: '1',
        title: 'Current Availability',
        iconName: 'Crown',
        tldr: 'Eternal is currently free. Paid subscriptions, digital purchases, tips, and creator payouts are unavailable.',
        subsections: [
          {
            id: 'premium-features',
            title: '1.1 No Paid Offer',
            content: [
              'Eternal does not currently offer Eternal Premium, paid upgrades, creator subscriptions, tips, or creator payouts. References to such features elsewhere are not an available offer or a promise of future availability.',
            ],
          },
        ],
      },
      {
        id: 'billing-and-renewals',
        number: '2',
        title: 'Billing and Subscriptions',
        iconName: 'CreditCard',
        tldr: 'There is no active checkout or recurring billing offer.',
        subsections: [
          {
            id: 'recurring-charges',
            title: '2.1 No Payment Authorization',
            content: [
              'Using Eternal does not authorize any payment or recurring charge. We do not currently identify Stripe, Apple, Google, or another provider as a processor for purchases on Eternal. Do not send card details, banking credentials, or payments to obtain unavailable features.',
            ],
          },
        ],
      },
      {
        id: 'refund-policy',
        number: '3',
        title: 'Consumer Rights and Disputed Charges',
        iconName: 'RefreshCw',
        tldr: 'This notice does not waive mandatory consumer rights.',
        subsections: [
          {
            id: 'general-refund-rules',
            title: '3.1 Your Rights Remain',
            content: [
              'This notice does not exclude any mandatory rights, including applicable withdrawal, refund, or payment-dispute rights. It does not impose a non-refundable policy for unavailable digital goods.',
              'If a charge claims to be from Eternal, check the transaction with your bank or the payment provider and contact eternalnet.support@proton.me. Do not email a full card number, security code, password, or identification document.',
            ],
          },
        ],
      },
      {
        id: 'creator-monetization',
        number: '4',
        title: 'Future Paid Features',
        iconName: 'HeartHandshake',
        tldr: 'Paid features require separate launch terms and operational checks.',
        subsections: [
          {
            id: 'creator-terms',
            title: '4.1 Before Any Future Sale',
            content: [
              'If paid features are introduced, the applicable seller, price, taxes, renewal and cancellation terms, refund and withdrawal information, and payment process must be disclosed before purchase. No launch date or creator monetization schedule has been established by this notice.',
            ],
          },
        ],
      },
      {
        id: 'contact-billing',
        number: '5',
        title: 'Contact',
        iconName: 'Mail',
        tldr: 'Contact: eternalnet.support@proton.me.',
        subsections: [
          {
            id: 'billing-contacts',
            title: '5.1 Project Operators',
            content: [
              'Eternal is jointly operated from Ukraine by Mykola Agh and Michal Agh, two individuals. Contact both operators at eternalnet.support@proton.me. Do not post private transaction details in public issues.',
            ],
          },
        ],
      },
    ],
  },
  uk: {
    hero: {
      archivedLink: 'Платні послуги',
      title: 'УМОВИ ПЛАТНИХ ПОСЛУГ ТА ПОВЕРНЕННЯ КОШТІВ',
      effectiveDate: 'Оновлено: 5 листопада 2026 р.',
      lastUpdated: 'Оновлено: 5 листопада 2026 р.',
      description:
        'Eternal наразі безкоштовний. Повідомлення пояснює відсутність платних пропозицій і зберігає застосовні права споживачів.',
    },
    toc: {
      contents: 'Зміст документа',
      readProgress: '% прочитано',
      print: 'Друк документа',
      backToTop: 'Нагору',
    },
    sections: [
      {
        id: 'paid-services-overview',
        number: '1',
        title: 'Поточна доступність',
        iconName: 'Crown',
        tldr: 'Eternal наразі безкоштовний. Платні підписки, цифрові покупки, донати та виплати авторам недоступні.',
        subsections: [
          {
            id: 'premium-features',
            title: '1.1 Платної пропозиції немає',
            content: [
              'Eternal наразі не пропонує Eternal Premium, платні покращення, підписки на авторів, донати чи виплати авторам. Згадки таких функцій в інших матеріалах не є доступною пропозицією або обіцянкою їх появи.',
            ],
          },
        ],
      },
      {
        id: 'billing-and-renewals',
        number: '2',
        title: 'Платежі та підписки',
        iconName: 'CreditCard',
        tldr: 'Активної оплати та пропозиції регулярних списань немає.',
        subsections: [
          {
            id: 'recurring-charges',
            title: '2.1 Немає згоди на списання',
            content: [
              'Використання Eternal не надає дозволу на оплату чи регулярні списання. Наразі ми не визначаємо Stripe, Apple, Google або іншого провайдера як оператора платежів за покупки в Eternal. Не надсилайте дані карток, банківські паролі чи платежі для отримання недоступних функцій.',
            ],
          },
        ],
      },
      {
        id: 'refund-policy',
        number: '3',
        title: 'Права споживачів та спірні списання',
        iconName: 'RefreshCw',
        tldr: 'Це повідомлення не скасовує обов’язкових прав споживачів.',
        subsections: [
          {
            id: 'general-refund-rules',
            title: '3.1 Ваші права зберігаються',
            content: [
              'Це повідомлення не обмежує обов’язкових прав, зокрема застосовних прав на відмову, повернення коштів чи оскарження платежу. Воно не встановлює неповоротності оплати недоступних цифрових товарів.',
              'Якщо списання позначене як платіж Eternal, перевірте його з банком або платіжним провайдером і напишіть на eternalnet.support@proton.me. Не надсилайте повний номер картки, код безпеки, пароль чи документ, що посвідчує особу.',
            ],
          },
        ],
      },
      {
        id: 'creator-monetization',
        number: '4',
        title: 'Майбутні платні функції',
        iconName: 'HeartHandshake',
        tldr: 'Для платних функцій потрібні окремі умови запуску та перевірка процедур.',
        subsections: [
          {
            id: 'creator-terms',
            title: '4.1 До початку будь-яких продажів',
            content: [
              'Якщо платні функції з’являться, до покупки мають бути розкриті продавець, ціна, податки, умови подовження та скасування, відмови й повернення коштів, а також порядок оплати. Це повідомлення не встановлює дати запуску чи графіка виплат авторам.',
            ],
          },
        ],
      },
      {
        id: 'contact-billing',
        number: '5',
        title: 'Контакт',
        iconName: 'Mail',
        tldr: 'Контакт: eternalnet.support@proton.me.',
        subsections: [
          {
            id: 'billing-contacts',
            title: '5.1 Оператори проєкту',
            content: [
              'Eternal спільно керують з України Mykola Agh та Michal Agh — дві фізичні особи. Звернутися до обох операторів можна за адресою eternalnet.support@proton.me. Не публікуйте приватні відомості про платежі у відкритих зверненнях.',
            ],
          },
        ],
      },
    ],
  },
};
