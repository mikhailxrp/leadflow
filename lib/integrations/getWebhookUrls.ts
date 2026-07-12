import 'server-only';

export type WebhookUrls = {
  tildaUrl: string;
  wordpressUrl: string;
};

/**
 * `null`, если `APP_URL` не сконфигурирован — вызывающая сторона решает,
 * как деградировать (500 в API-роуте, инлайн-сообщение на странице).
 */
export function getWebhookUrls(companyId: string): WebhookUrls | null {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    console.error('APP_URL is not configured');
    return null;
  }

  const baseUrl = appUrl.replace(/\/$/, '');

  return {
    tildaUrl: `${baseUrl}/api/webhooks/tilda/${companyId}`,
    wordpressUrl: `${baseUrl}/api/webhooks/wordpress/${companyId}`,
  };
}
