import 'server-only';

// Тонкая server-only-обёртка над HTTP-клиентом Bot API: держит гейт «только сервер» для
// прикладного кода Next (notifyManager/notifyManagement/reminders), не давая случайно
// импортировать отправку в Client Component. Реализация — в `lib/telegram/client.ts`,
// который намеренно без server-only, чтобы его же мог переиспользовать polling-воркер.
export { sendTelegramMessage } from './telegram/client';
