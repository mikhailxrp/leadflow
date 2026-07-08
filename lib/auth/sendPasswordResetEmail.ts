import { isEmailConfigured, sendEmail } from '@/lib/email';

type SendPasswordResetEmailInput = {
  email: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail({
  email,
  resetUrl,
}: SendPasswordResetEmailInput): Promise<void> {
  if (!isEmailConfigured()) {
    console.warn('Skipping password reset email: SMTP is not configured');
    return;
  }

  const subject = 'Лид-Канал: восстановление пароля';
  const text =
    `Вы запросили восстановление пароля для вашего аккаунта в Лид-Канал.\n\n` +
    `Перейдите по ссылке, чтобы задать новый пароль:\n${resetUrl}\n\n` +
    `Ссылка действует 1 час.\n` +
    `Если вы не запрашивали восстановление, просто проигнорируйте это письмо.`;

  const html = `
    <p>Вы запросили восстановление пароля для вашего аккаунта в Лид-Канал.</p>
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
