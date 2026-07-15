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
  // first-name-only conventions — treated as the full name unless a LAST_NAME_ALIASES
  // field is also present (normalizeLead appends it), covering forms that split name
  // into first/last parts (Fluent Forms, WPForms, Gravity Forms, ...).
  first_name: 'name',
  firstname: 'name',
  'first-name': 'name',
  fname: 'name',
  'your-name': 'name', // Contact Form 7 default field name

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
  'your-tel': 'phone', // Contact Form 7 default field name
  'your-phone': 'phone',

  // email
  email: 'email',
  'e-mail': 'email',
  почта: 'email',
  mail: 'email',
  email_address: 'email',
  emailaddress: 'email',
  'email-address': 'email',
  'your-email': 'email', // Contact Form 7 default field name

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
  'your-message': 'comment', // Contact Form 7 default field name
  'your-subject': 'comment',
};

/**
 * Keys that hold only the surname/last-name part of a contact's full name —
 * for forms that split the name into first/last (e.g. Fluent Forms' "Name"
 * element). normalizeLead appends the matched value to whatever FIELD_ALIASES
 * already resolved as the first-name part, instead of routing it to customFields.
 */
export const LAST_NAME_ALIASES = new Set([
  'last_name',
  'lastname',
  'last-name',
  'lname',
  'фамилия',
  'surname',
]);

/**
 * Common webhook/plugin metadata keys that are never a person's name, even
 * though they can be the sole leftover field after aliases/UTM/marketing are
 * stripped out (e.g. Fluent Forms sends `source`, `form_id`, `entry_id`
 * alongside the actual form fields). Excluded from normalizeLead's
 * last-resort "single remaining field → name" fallback.
 */
export const NON_NAME_META_FIELDS = new Set([
  'source',
  'page',
  'page_url',
  'pageurl',
  'url',
  'referrer',
  'referer',
  'ip',
  'ip_address',
  'user_agent',
  'useragent',
  'timestamp',
  'date',
  'time',
  'token',
  'key',
  'secret',
  'hash',
  'signature',
  'form_name',
  'formname',
]);

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
