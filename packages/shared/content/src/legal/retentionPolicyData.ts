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
      archivedLink: 'Retention and deletion',
      title: 'DATA RETENTION POLICY',
      effectiveDate: 'Updated: November 10, 2026',
      lastUpdated: 'Updated: November 10, 2026',
      description:
        'Verified provider periods and deletion behaviour, with remaining limits for media, backups and support records.',
    },
    toc: {
      contents: 'Table of Contents',
      readProgress: '% read',
      print: 'Print Document',
      backToTop: 'Back to top',
    },
    sections: [
      {
        id: 'deleting-content',
        number: '1',
        title: 'Deleting Your Content',
        iconName: 'Trash2',
        tldr: 'Deleting a message for yourself and deleting it for everyone are different actions.',
        subsections: [
          {
            id: 'deleting-content-details',
            title: 'Deleting Your Content',
            content: [
              'Use the deletion controls available for your posts and messages. Availability depends on the content type and your current access. A delete-for-me action does not delete another participant’s copy.',
              'Content removal in the application does not prove that every storage object, cached copy, backup, downloaded file, or copy held by another person has been erased. Do not treat a hidden item as a verified purge of all copies.',
            ],
          },
        ],
      },
      {
        id: 'account-lifetime-data',
        number: '2',
        title: 'Data Kept While You Use Eternal',
        iconName: 'UserCheck',
        tldr: 'Account data and content are used to provide the service.',
        subsections: [
          {
            id: 'account-lifetime-data-details',
            title: 'Data Kept While You Use Eternal',
            content: [
              'Eternal stores account details, profile settings, content, and other records used to provide its features. The detailed retention schedule for each category and each hosting provider is not yet complete.',
              'No automatic deletion after two years of inactivity has been confirmed. You can request account deletion through account settings or contact eternalnet.support@proton.me for assistance.',
            ],
          },
        ],
      },
      {
        id: 'specific-retention-periods',
        number: '3',
        title: 'Backups, Media and Other Retention',
        iconName: 'Clock',
        tldr: 'Some provider periods are confirmed; deletion of every copy is not guaranteed.',
        subsections: [
          {
            id: 'specific-retention-periods-details',
            title: 'Backups, Media and Other Retention',
            content: [
              'As checked on November 9–10, 2026, Cloudflare R2 rules expire temporary incoming uploads after one day and abort incomplete multipart uploads after seven days. These rules do not erase all final media.',
              'Unpublished uploads become eligible for application cleanup after two days. Cleanup runs in bounded passes when the service is running, so eligibility is not a guaranteed deletion deadline. Completed private media can be removed after its owner is deleted only when no remaining chat attachment references it. Complete erasure of public or older media has not been verified.',
              'The current Render Hobby log period is seven days. Sentry Developer documents a 30-day period for newly ingested errors, logs, spans and transactions; historical retention depends on the plan when an event was received. Account deletion does not by itself erase provider copies.',
              'There is no verified single expiry period for all backup copies, moderation records or support mail. After a support decision has been carried out and answered, unnecessary attachments and details should be removed; a minimal record may remain only for a specific continuing need, such as a dispute. Backup recovery must respect later deletion decisions. No general 30-day or 45-day purge guarantee applies.',
              'Eternal does not currently offer paid services or an identity-document age-verification process. This policy does not claim that billing records or submitted identity documents are routinely collected. Do not email an identity document unless a necessary, proportionate verification process has first been explained.',
              'Any lawful preservation for a legal obligation or claim needs an applicable basis, a defined purpose, access controls, and a limited retention period. This notice does not grant an unlimited right to retain data or use it to train safety systems.',
            ],
          },
        ],
      },
      {
        id: 'account-deletion-lifecycle',
        number: '4',
        title: 'Deleting Your Account',
        iconName: 'ShieldAlert',
        tldr: 'Account deletion is permanent; no login-based recovery grace period is implemented.',
        subsections: [
          {
            id: 'account-deletion-lifecycle-details',
            title: 'Deleting Your Account',
            content: [
              'The current account-deletion process verifies your password and deletes the account from the active database, together with associated database records according to their relationships. If you own communities, transfer their ownership before deleting your account.',
              'There is no 15–30 day recovery window in the current implementation. Signing in again does not cancel a completed deletion. This account action does not by itself verify erasure across media storage, specialist services, third-party providers, or backups; those procedures remain under review.',
            ],
          },
        ],
      },
      {
        id: 'rights-and-contacts',
        number: '5',
        title: 'Your Rights and Contact',
        iconName: 'Mail',
        tldr: 'Contact: eternalnet.support@proton.me.',
        subsections: [
          {
            id: 'rights-and-contacts-details',
            title: 'Your Rights and Contact',
            content: [
              'For access, correction, deletion, retention questions, or an objection, contact eternalnet.support@proton.me. These implementation limits do not waive any applicable data-protection rights or the right to complain to a competent supervisory authority.',
              'Eternal is jointly operated from Ukraine by Mykola Agh and Michal Agh. No DPO appointment has been confirmed. The incomplete retention schedule remains an operational compliance gap, not an exemption from applicable law.',
            ],
          },
        ],
      },
    ],
  },
  uk: {
    hero: {
      archivedLink: 'Зберігання та видалення',
      title: 'ПОЛІТИКА ЗБЕРІГАННЯ ТА ВИДАЛЕННЯ ДАНИХ',
      effectiveDate: 'Оновлено: 10 листопада 2026 р.',
      lastUpdated: 'Оновлено: 10 листопада 2026 р.',
      description:
        'Підтверджені строки провайдерів і поведінка видалення та невирішені питання медіа, резервних копій і звернень підтримки.',
    },
    toc: {
      contents: 'Зміст',
      readProgress: '% прочитано',
      print: 'Друк документа',
      backToTop: 'Нагору',
    },
    sections: [
      {
        id: 'deleting-content',
        number: '1',
        title: 'Видалення свого контенту',
        iconName: 'Trash2',
        tldr: 'Видалення повідомлення для себе та для всіх — різні дії.',
        subsections: [
          {
            id: 'deleting-content-details',
            title: 'Видалення свого контенту',
            content: [
              'Використовуйте доступні дії видалення для своїх дописів і повідомлень. Їх доступність залежить від типу контенту та поточних прав доступу. Видалення для себе не видаляє копію іншого учасника.',
              'Прибирання контенту із застосунку не доводить видалення кожного об’єкта у сховищі, кешованої чи резервної копії, завантаженого файлу або копії іншої особи. Прихований запис не означає перевіреного очищення всіх копій.',
            ],
          },
        ],
      },
      {
        id: 'account-lifetime-data',
        number: '2',
        title: 'Дані під час користування Eternal',
        iconName: 'UserCheck',
        tldr: 'Дані облікового запису та контент потрібні для надання сервісу.',
        subsections: [
          {
            id: 'account-lifetime-data-details',
            title: 'Дані під час користування Eternal',
            content: [
              'Eternal зберігає дані облікового запису, профіль, налаштування, контент та інші записи для своїх функцій. Детальний графік зберігання за кожною категорією й провайдером ще не завершено.',
              'Автоматичне видалення після двох років неактивності не підтверджено. Видалення облікового запису можна запросити у налаштуваннях; по допомогу пишіть на eternalnet.support@proton.me.',
            ],
          },
        ],
      },
      {
        id: 'specific-retention-periods',
        number: '3',
        title: 'Резервні копії, медіа та інше зберігання',
        iconName: 'Clock',
        tldr: 'Частину строків провайдерів підтверджено; видалення кожної копії не гарантоване.',
        subsections: [
          {
            id: 'specific-retention-periods-details',
            title: 'Резервні копії, медіа та інше зберігання',
            content: [
              'За перевіркою 9–10 листопада 2026 року правила Cloudflare R2 передбачають видалення тимчасових вхідних завантажень через один день і переривання незавершених багаточастинних завантажень через сім днів. Ці правила не стирають усі остаточні медіафайли.',
              'Неопубліковані завантаження підлягають прикладному очищенню після двох днів. Очищення виконується обмеженими проходами, коли сервіс працює, тому це не гарантований строк видалення. Завершені приватні медіа можна прибрати після видалення власника лише за відсутності посилань із вкладень чату. Повне очищення публічних або старіших медіа не підтверджене.',
              'Поточний строк журналів Render Hobby — сім днів. Sentry Developer документує 30 днів для нових помилок, журналів, spans і transactions; історичне зберігання залежить від тарифу на момент надходження події. Видалення акаунта саме по собі не стирає копії провайдера.',
              'Єдиного підтвердженого строку для всіх резервних копій, записів модерації та листів підтримки немає. Після виконання рішення за зверненням і відповіді зайві вкладення та відомості мають прибиратися; мінімальний запис може залишатися лише для конкретної чинної потреби, наприклад спору. Відновлення резервної копії має враховувати пізніші рішення про видалення. Загальної гарантії очищення за 30 чи 45 днів немає.',
              'Eternal наразі не пропонує платних послуг або перевірки віку через документи. Політика не стверджує, що платіжні записи чи копії документів регулярно збираються. Не надсилайте документ поштою без попереднього пояснення необхідної та пропорційної процедури перевірки.',
              'Будь-яке правомірне збереження для законного обов’язку чи спору потребує застосовної підстави, визначеної мети, обмеження доступу та строку зберігання. Повідомлення не надає необмеженого права зберігати дані чи навчати на них системи безпеки.',
            ],
          },
        ],
      },
      {
        id: 'account-deletion-lifecycle',
        number: '4',
        title: 'Видалення облікового запису',
        iconName: 'ShieldAlert',
        tldr: 'Видалення постійне; пільгового періоду відновлення через вхід немає.',
        subsections: [
          {
            id: 'account-deletion-lifecycle-details',
            title: 'Видалення облікового запису',
            content: [
              'Поточна процедура перевіряє пароль і видаляє обліковий запис з активної бази даних разом із пов’язаними записами відповідно до їхніх зв’язків. Якщо ви володієте спільнотами, передайте права власності до видалення облікового запису.',
              'Відновлення протягом 15–30 днів у поточній реалізації немає. Повторний вхід не скасовує завершене видалення. Ця дія сама по собі не підтверджує очищення медіасховищ, окремих сервісів, сторонніх провайдерів чи резервних копій; відповідні процедури ще перевіряються.',
            ],
          },
        ],
      },
      {
        id: 'rights-and-contacts',
        number: '5',
        title: 'Ваші права та контакт',
        iconName: 'Mail',
        tldr: 'Контакт: eternalnet.support@proton.me.',
        subsections: [
          {
            id: 'rights-and-contacts-details',
            title: 'Ваші права та контакт',
            content: [
              'З питань доступу, виправлення, видалення, строків зберігання чи заперечення пишіть на eternalnet.support@proton.me. Обмеження реалізації не скасовують застосовних прав на захист даних і звернення до компетентного наглядового органу.',
              'Eternal спільно керують з України Mykola Agh та Michal Agh. Призначення DPO не підтверджено. Незавершений графік зберігання є прогалиною у процедурах, а не винятком із закону.',
            ],
          },
        ],
      },
    ],
  },
};
