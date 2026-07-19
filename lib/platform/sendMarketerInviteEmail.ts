import { isEmailConfigured, sendEmail } from '@/lib/email';

type SendMarketerInviteEmailInput = {
  email: string;
  inviteUrl: string;
};

/**
 * Письмо приглашённому маркетологу со ссылкой на подтверждение и установку
 * пароля. Best-effort: без настроенного SMTP тихо пропускается — ссылка также
 * показывается суперадмину в модальном окне.
 */
export async function sendMarketerInviteEmail({
  email,
  inviteUrl,
}: SendMarketerInviteEmailInput): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('Skipping marketer invite email: SMTP is not configured');
    return;
  }

  const subject = 'Лид-Канал Platform: приглашение маркетолога';
  const text =
    `Вас пригласили маркетологом в платформу Лид-Канал.\n\n` +
    `Перейдите по ссылке, чтобы задать пароль и войти:\n${inviteUrl}\n\n` +
    `Ссылка действует 7 дней.\n` +
    `Если вы не ожидали это приглашение, просто проигнорируйте письмо.`;

  const html = `
    <p>Вас пригласили маркетологом в платформу Лид-Канал.</p>
    <p>
      Перейдите по ссылке, чтобы задать пароль и войти:<br />
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
