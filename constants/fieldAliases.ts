/**
 * Aliases for standard lead fields.
 * Keys are lowercase — comparison is always .toLowerCase() on input.
 * Values map to the canonical Lead model field names.
 */
export const FIELD_ALIASES: Record<string, 'name' | 'phone' | 'email' | 'comment'> = {
  // name
  name: 'name',
  имя: 'name',
  фио: 'name',
  название: 'name',
  full_name: 'name',
  fullname: 'name',
  contact_name: 'name',
  'contact-name': 'name',
  клиент: 'name',
  заявитель: 'name',

  // phone
  phone: 'phone',
  телефон: 'phone',
  tel: 'phone',
  тел: 'phone',
  telephone: 'phone',
  mobile: 'phone',
  phone_number: 'phone',
  phonenumber: 'phone',
  'phone-number': 'phone',
  мобильный: 'phone',

  // email
  email: 'email',
  'e-mail': 'email',
  почта: 'email',
  mail: 'email',
  email_address: 'email',
  emailaddress: 'email',
  'email-address': 'email',

  // comment
  comment: 'comment',
  комментарий: 'comment',
  comments: 'comment',
  message: 'comment',
  сообщение: 'comment',
  text: 'comment',
  текст: 'comment',
  question: 'comment',
  вопрос: 'comment',
  заявка: 'comment',
  описание: 'comment',
  description: 'comment',
};

/**
 * Marketing/tracking fields that go into Lead.marketing (not customFields).
 * Keys are compared case-insensitively.
 */
export const MARKETING_FIELDS = new Set([
  'gclid',
  'yclid',
  'fbclid',
  'msclkid',
  'pixel_id',
  'fb_pixel',
  '_ga',
  'roistat',
  'roistat_visit',
  'ymuid',
  'metrika_id',
  'yaclid',
  '_ym_uid',
  '_ym_d',
  'calltouch_session',
  'calltracking_id',
  'comagic_session',
]);
