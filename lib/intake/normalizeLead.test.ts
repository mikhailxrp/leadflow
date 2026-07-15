import { describe, expect, it } from 'vitest';
import { normalizeLead } from '@/lib/intake/normalizeLead';

describe('normalizeLead', () => {
  it('плоский payload с известными алиасами — распознаётся как раньше (Tilda)', () => {
    const result = normalizeLead(
      { Имя: 'Иван', Телефон: '+7 999 123-45-67', email: 'ivan@example.com', utm_source: 'yandex' },
      'tilda',
    );
    expect(result.name).toBe('Иван');
    expect(result.phone).toBe('+7 999 123-45-67');
    expect(result.email).toBe('ivan@example.com');
    expect(result.utm).toEqual({ utm_source: 'yandex' });
  });

  it('Fluent Forms: поля обёрнуты в "fields" + input_text как имя — реальный кейс WordPress', () => {
    const raw = {
      fields: {
        email: 'dmihail528@gmail.com',
        input_text: 'Михаил',
        description: 'Расскажите о ваших услугах',
        _wp_http_referer: '/contact/',
        __fluentform_embeded_post_id: '62',
        _fluentform_3_fluentformnonce: '6353766028',
      },
      source: 'https://blog.archlab.fun/',
      form_id: 3,
      entry_id: 12,
    };

    const result = normalizeLead(raw, 'wordpress');

    expect(result.email).toBe('dmihail528@gmail.com');
    expect(result.name).toBe('Михаил');
    expect(result.comment).toBe('Расскажите о ваших услугах');
    // технические поля остаются в customFields, но не становятся именем
    expect(result.customFields['form_id']).toBe(3);
    expect(result.customFields['entry_id']).toBe(12);
    expect(result.customFields['source']).toBe('https://blog.archlab.fun/');
  });

  it('Contact Form 7: your-name/your-email/your-tel/your-message', () => {
    const result = normalizeLead(
      {
        'your-name': 'Пётр',
        'your-email': 'petr@example.com',
        'your-tel': '89991234567',
        'your-message': 'Хочу заказать',
      },
      'wordpress',
    );
    expect(result.name).toBe('Пётр');
    expect(result.email).toBe('petr@example.com');
    expect(result.phone).toBe('89991234567');
    expect(result.comment).toBe('Хочу заказать');
  });

  it('разделённое имя: first_name + last_name склеиваются в одно поле name', () => {
    const result = normalizeLead(
      { first_name: 'Анна', last_name: 'Сидорова', email: 'anna@example.com' },
      'wordpress',
    );
    expect(result.name).toBe('Анна Сидорова');
  });

  it('Имя + Фамилия (кириллица) — тоже склеиваются', () => {
    const result = normalizeLead({ имя: 'Ольга', фамилия: 'Кузнецова' }, 'wordpress');
    expect(result.name).toBe('Ольга Кузнецова');
  });

  it('значение похоже на email/телефон под нераспознанным ключом — определяется по форме значения', () => {
    const result = normalizeLead(
      { custom_field_7: 'someone@example.com', custom_field_8: '+7 (999) 123-45-67' },
      'api',
    );
    expect(result.email).toBe('someone@example.com');
    expect(result.phone).toBe('+7 (999) 123-45-67');
  });

  it('несколько неоднозначных текстовых полей — имя не угадывается (остаётся null)', () => {
    const result = normalizeLead(
      { input_text: 'Михаил', input_text_2: 'ООО Ромашка' },
      'wordpress',
    );
    expect(result.name).toBeNull();
    expect(result.customFields['input_text']).toBe('Михаил');
    expect(result.customFields['input_text_2']).toBe('ООО Ромашка');
  });

  it('вложенность в несколько уровней — флаттенится рекурсивно', () => {
    const result = normalizeLead(
      { data: { fields: { name: 'Сергей', phone: '123456' } } },
      'api',
    );
    expect(result.name).toBe('Сергей');
    expect(result.phone).toBe('123456');
  });

  it('коллизия ключей при флаттенинге — вложенное значение не затирает верхнеуровневое', () => {
    const result = normalizeLead(
      { source: 'top-level-source', fields: { source: 'nested-source', name: 'Игорь' } },
      'wordpress',
    );
    expect(result.customFields['source']).toBe('top-level-source');
    expect(result.customFields['fields.source']).toBe('nested-source');
    expect(result.name).toBe('Игорь');
  });

  it('пустые/отсутствующие поля — null, приём не падает', () => {
    const result = normalizeLead({ name: '   ', random: null }, 'api');
    expect(result.name).toBeNull();
    expect(result.customFields['random']).toBeNull();
  });
});
