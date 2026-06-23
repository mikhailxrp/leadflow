import nodemailer from 'nodemailer';

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !user || !pass || !from) {
    return null;
  }

  const parsedPort = Number(port);
  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    return null;
  }

  return {
    host,
    port: parsedPort,
    user,
    pass,
    from,
  };
}

export function isEmailConfigured(): boolean {
  return getSmtpConfig() !== null;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: SendEmailInput): Promise<void> {
  const config = getSmtpConfig();
  if (!config) {
    throw new Error('SMTP is not configured');
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
}
