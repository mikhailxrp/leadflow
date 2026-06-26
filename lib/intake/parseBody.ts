/**
 * Parses the body of an incoming HTTP request into a flat key-value record.
 * Handles JSON, application/x-www-form-urlencoded, multipart/form-data, and raw text.
 * Never throws — returns {} on any parse failure so the caller decides what to do.
 */
export async function parseBody(req: Request): Promise<Record<string, unknown>> {
  const contentType = req.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      const json = (await req.json()) as unknown;
      if (isPlainObject(json)) {
        return json as Record<string, unknown>;
      }
      return {};
    }

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const text = await req.text();
      return parseUrlEncoded(text);
    }

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const result: Record<string, unknown> = {};
      formData.forEach((value, key) => {
        if (typeof value === 'string') {
          result[key] = value;
        }
      });
      return result;
    }

    // No recognised Content-Type — attempt JSON, then URL-encoded, then give up.
    const text = await req.text();
    if (!text.trim()) return {};

    try {
      const json = JSON.parse(text) as unknown;
      if (isPlainObject(json)) {
        return json as Record<string, unknown>;
      }
    } catch {
      // not JSON
    }

    const fromUrl = parseUrlEncoded(text);
    if (Object.keys(fromUrl).length > 0) return fromUrl;

    return {};
  } catch {
    return {};
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseUrlEncoded(text: string): Record<string, unknown> {
  try {
    const params = new URLSearchParams(text);
    const result: Record<string, unknown> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  } catch {
    return {};
  }
}
