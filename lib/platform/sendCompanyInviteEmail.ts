import { isEmailConfigured, sendEmail } from '@/lib/email';

type SendCompanyInviteEmailInput = {
  email: string;
  companyName: string;
  inviteUrl: string;
};

/**
 * Письмо первому администратору созданной компании со ссылкой-приглашением.
 * Best-effort: без настроенного SMTP тихо пропускается — ссылка также
 * показывается платформенному администратору в модальном окне.
 */
export async function sendCompanyInviteEmail({
  email,
  companyName,
  inviteUrl,
}: SendCompanyInviteEmailInput): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('Skipping company invite email: SMTP is not configured');
    return;
  }

  const subject = 'Лид-Канал: приглашение администратора компании';
  const text =
    `Вас пригласили администратором компании «${companyName}» в Лид-Канал.\n\n` +
    `Перейдите по ссылке, чтобы задать имя и пароль:\n${inviteUrl}\n\n` +
    `Ссылка действует 7 дней.\n` +
    `Если вы не ожидали это приглашение, просто проигнорируйте письмо.`;

  const html = `
    <p>Вас пригласили администратором компании «${companyName}» в Лид-Канал.</p>
    <p>
      Перейдите по ссылке, чтобы задать имя и пароль:<br />
      <a href="${inviteUrl}">${inviteUrl}</a>
    </p>
    <p>Ссылка действует 7 дней.</p>
    <p>Если вы не ожидали это приглашение, просто проигнорируйте письмо.</p>
  `;

  await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}
