import 'server-only';

import { prisma } from '@/lib/prisma';
import { isEmailConfigured, sendEmail } from '@/lib/email';
import type { CascadeBlockedCompany } from '@/lib/platform/cascadeBlock';

type SendCascadeBlockEmailInput = {
  marketerName: string;
  marketerEmail: string;
  companies: CascadeBlockedCompany[];
  blockedAt: Date;
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

type CompanyAdminContact = {
  name: string;
  email: string;
};

async function fetchCompanyAdmins(
  companyIds: string[],
): Promise<Map<string, CompanyAdminContact[]>> {
  const admins = await prisma.user.findMany({
    where: { companyId: { in: companyIds }, role: 'ADMIN' },
    select: { companyId: true, name: true, email: true },
  });

  const adminsByCompanyId = new Map<string, CompanyAdminContact[]>();
  for (const admin of admins) {
    const existing = adminsByCompanyId.get(admin.companyId) ?? [];
    existing.push({ name: admin.name, email: admin.email });
    adminsByCompanyId.set(admin.companyId, existing);
  }

  return adminsByCompanyId;
}

export async function sendCascadeBlockEmail({
  marketerName,
  marketerEmail,
  companies,
  blockedAt,
}: SendCascadeBlockEmailInput): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('Skipping cascade block email: SMTP is not configured');
    return;
  }

  if (companies.length === 0) {
    return;
  }

  const superAdmins = await prisma.platformAdmin.findMany({
    where: { role: 'SUPER_ADMIN', isActive: true, deletedAt: null },
    select: { email: true },
  });

  if (superAdmins.length === 0) {
    return;
  }

  const adminsByCompanyId = await fetchCompanyAdmins(
    companies.map((company) => company.id),
  );

  const date = formatDate(blockedAt);

  const companyLines = companies.map((company) => {
    const admins = adminsByCompanyId.get(company.id) ?? [];
    const adminsText =
      admins.length > 0
        ? admins.map((admin) => `${admin.name} <${admin.email}>`).join(', ')
        : 'администратор не найден';
    return `- ${company.name} — ${adminsText}`;
  });

  const subject = `Лид-Канал Platform: маркетолог ${marketerName} заблокирован — ${companies.length} компаний затронуто`;
  const text =
    `Маркетолог ${marketerName} (${marketerEmail}) заблокирован ${date}.\n` +
    `Каскадно заблокированы следующие компании:\n\n` +
    `${companyLines.join('\n')}`;

  const htmlItems = companies
    .map((company) => {
      const admins = adminsByCompanyId.get(company.id) ?? [];
      const adminsText =
        admins.length > 0
          ? admins
              .map(
                (admin) =>
                  `${escapeHtml(admin.name)} &lt;${escapeHtml(admin.email)}&gt;`,
              )
              .join(', ')
          : 'администратор не найден';
      return `<li><strong>${escapeHtml(company.name)}</strong> — ${adminsText}</li>`;
    })
    .join('');

  const html = `
    <p>Маркетолог <strong>${escapeHtml(marketerName)}</strong> (${escapeHtml(marketerEmail)}) заблокирован ${date}.</p>
    <p>Каскадно заблокированы следующие компании:</p>
    <ul>${htmlItems}</ul>
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
