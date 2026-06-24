import 'server-only';

import { isEmailConfigured, sendEmail } from '@/lib/email';
import type { CompanyNeedingRenewal } from '@/lib/platform/subscriptionReminders';

type SendSubscriptionReminderEmailInput = {
  email: string;
  companies: CompanyNeedingRenewal[];
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(value);
}

function pluralDays(count: number): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod100 >= 11 && mod100 <= 14) {
    return 'дней';
  }

  if (mod10 === 1) {
    return 'день';
  }

  if (mod10 >= 2 && mod10 <= 4) {
    return 'дня';
  }

  return 'дней';
}

function formatDueDescription(daysUntilDue: number): string {
  if (daysUntilDue === 0) {
    return 'срок сегодня';
  }

  if (daysUntilDue > 0) {
    return `осталось ${daysUntilDue} ${pluralDays(daysUntilDue)}`;
  }

  const overdueDays = Math.abs(daysUntilDue);
  return `просрочено на ${overdueDays} ${pluralDays(overdueDays)}`;
}

function buildCompanyLine(company: CompanyNeedingRenewal): string {
  const date = formatDate(company.nextPaymentAt);
  const due = formatDueDescription(company.daysUntilDue);
  return `- ${company.name} — ${date} (${due})`;
}

export async function sendSubscriptionReminderEmail({
  email,
  companies,
}: SendSubscriptionReminderEmailInput): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn(
      'Skipping subscription reminder email: SMTP is not configured',
    );
    return;
  }

  const companyLines = companies.map(buildCompanyLine);
  const subject = `LeadFlow Platform: ${companies.length} компаний требуют продления`;
  const text =
    `Ежедневный дайджест о сроках продления подписки компаний LeadFlow.\n\n` +
    `${companyLines.join('\n')}\n\n` +
    `Откройте платформенную панель, чтобы обновить даты продления.`;

  const htmlItems = companies
    .map((company) => {
      const date = formatDate(company.nextPaymentAt);
      const due = formatDueDescription(company.daysUntilDue);
      return `<li><strong>${company.name}</strong> — ${date} (${due})</li>`;
    })
    .join('');

  const html = `
    <p>Ежедневный дайджест о сроках продления подписки компаний LeadFlow.</p>
    <ul>${htmlItems}</ul>
    <p>Откройте платформенную панель, чтобы обновить даты продления.</p>
  `;

  await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}
