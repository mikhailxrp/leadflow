import 'server-only';

import { isEmailConfigured, sendEmail } from '@/lib/email';
import type { DeletedCompanyAdmin } from '@/lib/platform/deleteCompany';
import { prisma } from '@/lib/prisma';

type SendCompanyDeletedEmailInput = {
  companyName: string;
  admins: DeletedCompanyAdmin[];
  deletedByEmail: string;
  deletedAt: Date;
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAdmins(admins: DeletedCompanyAdmin[]): string {
  if (admins.length === 0) {
    return 'администратор не найден';
  }
  return admins.map((admin) => `${admin.name} <${admin.email}>`).join(', ');
}

/**
 * Уведомляет всех активных SUPER_ADMIN об удалении компании и сохраняет контакты её
 * администраторов (после hard-delete они в БД больше не существуют — письмо и есть
 * единственная запись). Graceful skip при не настроенном SMTP, как в письме о
 * каскадной блокировке (`sendCascadeBlockEmail`).
 */
export async function sendCompanyDeletedEmail({
  companyName,
  admins,
  deletedByEmail,
  deletedAt,
}: SendCompanyDeletedEmailInput): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('Skipping company deleted email: SMTP is not configured');
    return;
  }

  const superAdmins = await prisma.platformAdmin.findMany({
    where: { role: 'SUPER_ADMIN', isActive: true, deletedAt: null },
    select: { email: true },
  });

  if (superAdmins.length === 0) {
    return;
  }

  const date = formatDate(deletedAt);

  const subject = `Лид-Канал Platform: компания «${companyName}» удалена`;
  const text =
    `Компания «${companyName}» удалена ${date} пользователем ${deletedByEmail}.\n\n` +
    `Контакты администраторов удалённой компании:\n${formatAdmins(admins)}`;

  const adminsHtml =
    admins.length > 0
      ? admins
          .map(
            (admin) =>
              `${escapeHtml(admin.name)} &lt;${escapeHtml(admin.email)}&gt;`,
          )
          .join(', ')
      : 'администратор не найден';

  const html = `
    <p>Компания <strong>${escapeHtml(companyName)}</strong> удалена ${date} пользователем ${escapeHtml(deletedByEmail)}.</p>
    <p>Контакты администраторов удалённой компании:</p>
    <p>${adminsHtml}</p>
  `;

  for (const admin of superAdmins) {
    await sendEmail({
      to: admin.email,
      subject,
      text,
      html,
    });
  }
}
