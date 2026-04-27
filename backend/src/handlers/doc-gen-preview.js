/**
 * GET /api/test-guidelines/:id/doc-gen-preview?lang=en
 *
 * Proxies to the Java doc-generate service:
 *   GET http://<JAVA_API_BASE>/doc-gen-preview/:id?lang=en
 *
 * Returns the full HTML document preview for the given test guideline.
 * This is a full-document preview (not per-chapter), used on the
 * TestGuidelines list page when a user clicks a row item.
 */
export const docGenPreview = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);
    const lang = c.req.query('lang') || 'en';

    if (!tgId || isNaN(tgId)) {
      return c.json(
        { error: { code: 'BAD_REQUEST', message: 'Valid test guideline ID required' } },
        400,
      );
    }

    const javaBase = process.env.DOC_GENERATE_URL || 'http://localhost:8080';
    const url = `${javaBase}/doc-gen-preview/${tgId}?lang=${encodeURIComponent(lang)}`;

    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'text/html, application/json',
      },
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      console.error(`Java doc-gen-preview error ${upstream.status}:`, text);
      return c.json(
        { error: { code: 'UPSTREAM_ERROR', message: `Doc preview failed (${upstream.status})` } },
        upstream.status >= 500 ? 502 : upstream.status,
      );
    }

    const contentType = upstream.headers.get('content-type') || 'text/html';
    const body = await upstream.text();

    return c.body(body, 200, { 'Content-Type': contentType });
  } catch (err) {
    console.error('Doc gen preview proxy error:', err);
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch document preview' } },
      500,
    );
  }
};