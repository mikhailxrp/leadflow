/**
 * Allow-list маркетолога внутри компании — единственный источник правды.
 * Deny-by-default: страница/эндпоинт, не перечисленные здесь, запрещены.
 */

export const MARKETER_ALLOWED_PAGES: string[] = [
  '/leads',
  '/pipeline',
  '/admin/integrations',
  '/reports',
];

type MarketerAllowedApiRule = {
  pattern: RegExp;
  methods: string[];
};

const MARKETER_ALLOWED_API: MarketerAllowedApiRule[] = [
  { pattern: /^\/api\/leads$/, methods: ['GET'] },
  { pattern: /^\/api\/leads\/[^/]+$/, methods: ['GET'] },
  { pattern: /^\/api\/leads\/[^/]+\/duplicates$/, methods: ['GET'] },
  { pattern: /^\/api\/leads\/[^/]+\/events$/, methods: ['GET'] },
  { pattern: /^\/api\/leads\/[^/]+\/qualification$/, methods: ['PATCH'] },
  { pattern: /^\/api\/pipeline\/board$/, methods: ['GET'] },
  { pattern: /^\/api\/stages$/, methods: ['GET'] },
  { pattern: /^\/api\/loss-reasons$/, methods: ['GET'] },
  { pattern: /^\/api\/api-keys$/, methods: ['GET', 'POST'] },
  { pattern: /^\/api\/api-keys\/[^/]+$/, methods: ['PATCH', 'DELETE'] },
  { pattern: /^\/api\/admin\/integrations\/health$/, methods: ['GET'] },
  { pattern: /^\/api\/integrations\/yandex\/metrika$/, methods: ['PATCH'] },
  { pattern: /^\/api\/reports\/summary$/, methods: ['GET'] },
  { pattern: /^\/api\/reports\/by-source$/, methods: ['GET'] },
  { pattern: /^\/api\/reports\/by-employee$/, methods: ['GET'] },
  { pattern: /^\/api\/reports\/loss-reasons$/, methods: ['GET'] },
  { pattern: /^\/api\/reports\/export$/, methods: ['GET'] },
  { pattern: /^\/api\/ad-spend$/, methods: ['GET', 'POST'] },
];

export function isMarketerAllowedPage(pathname: string): boolean {
  return MARKETER_ALLOWED_PAGES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isMarketerAllowedApi(pathname: string, method: string): boolean {
  return MARKETER_ALLOWED_API.some(
    (rule) => rule.pattern.test(pathname) && rule.methods.includes(method),
  );
}
