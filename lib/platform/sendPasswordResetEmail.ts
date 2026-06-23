import { isEmailConfigured, sendEmail } from '@/lib/email';

type SendPlatformPasswordResetEmailInput = {
  email: string;
  resetUrl: string;
};

export async function sendPlatformPasswordResetEmail({
  email,
  resetUrl,
}: SendPlatformPasswordResetEmailInput): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('Skipping platform password reset email: SMTP is not configured');
    return;
  }

  const subject = 'LeadFlow Platform: восстановление пароля';
  const text =
    `Вы запросили восстановление пароля для платформенного администратора LeadFlow.\n\n` +
    `Перейдите по ссылке, чтобы задать новый пароль:\n${resetUrl}\n\n` +
    `Ссылка действует 1 час.\n` +
    `Если вы не запрашивали восстановление, просто проигнорируйте это письмо.`;

  const html = `
    <p>Вы запросили восстановление пароля для платформенного администратора LeadFlow.</p>
    <p>
      Перейдите по ссылке, чтобы задать новый пароль:<br />
      <a href="${resetUrl}">${resetUrl}</a>
    </p>
    <p>Ссылка действует 1 час.</p>
    <p>Если вы не запрашивали восстановление, просто проигнорируйте это письмо.</p>
  `;

  await sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}
