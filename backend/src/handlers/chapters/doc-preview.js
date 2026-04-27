import { sanitizeDocPreviewHtml } from '../../utils/html.js';
import { queryOne } from '../../utils/db.js';
import { findByUsername } from '../../repositories/user.js';
import { resolveUsername } from '../../utils/resolve-user.js';

/**
 * GET /api/test-guidelines/:id/chapters/:ch/preview?lang=en
 *
 * Proxies to the Java doc-generate service:
 *   GET http://<JAVA_API_BASE>/doc-generate/:id/chapter/:chNum?lang=en
 *
 * The chapter number is normalised: "01" → 1, "02" → 2, etc.
 * 
 * The HTML response is sanitized on the backend to fix malformed HTML from the Java service.
 */
export const docPreview = async (c) => {
  try {
    const tgId = parseInt(c.req.param('id'), 10);
    const ch   = c.req.param('ch');           // e.g. "01", "07"
    const lang = c.req.query('lang') || 'en';

    if (!tgId || isNaN(tgId)) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Valid test guideline ID required' } }, 400);
    }

    // Check TG status and user permissions
    const tg = await queryOne(
      'SELECT Status_Code FROM TG WHERE TG_ID = ?',
      [tgId]
    );

    if (!tg) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Test guideline not found' } }, 404);
    }

    // Block CRT preview for non-admin users
    if (tg.Status_Code === 'CRT') {
      const username = resolveUsername(c);
      const dbUser = await findByUsername(username);
      if (!dbUser || dbUser.roleCode !== 'ADM') {
        return c.json(
          { error: { code: 'FORBIDDEN', message: 'Preview not available for drafts in Created status' } },
          403
        );
      }
    }

    // Strip leading zero so Java receives "1" not "01"
    // Chapter 0 is the cover page (chapter 00)
    const chNum = parseInt(ch, 10);
    if (isNaN(chNum) || chNum < 0 || chNum > 11) {
      return c.json({ error: { code: 'BAD_REQUEST', message: 'Invalid chapter number' } }, 400);
    }

    const javaBase = process.env.DOC_GENERATE_URL || 'http://localhost:8080';
    const url = `${javaBase}/doc-generate/${tgId}/chapter/${chNum}?lang=${encodeURIComponent(lang)}`;

    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/html, application/json',
      },
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      console.error(`Java doc-generate error ${upstream.status}:`, text);
      return c.json(
        { error: { code: 'UPSTREAM_ERROR', message: `Doc generation failed (${upstream.status})` } },
        upstream.status >= 500 ? 502 : upstream.status,
      );
    }

    const contentType = upstream.headers.get('content-type') || 'text/html';
    const body = await upstream.text();

    // Sanitize the HTML response to fix malformed HTML from the Java service
    // This should be done on the backend, not the frontend
    const sanitizedBody = sanitizeDocPreviewHtml(body);

    return c.body(sanitizedBody, 200, { 'Content-Type': contentType });
  } catch (err) {
    console.error('Doc preview proxy error:', err);
    return c.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch document preview' } },
      500,
    );
  }
};