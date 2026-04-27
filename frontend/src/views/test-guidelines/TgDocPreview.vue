<script setup lang="ts">
/**
 * TgDocPreviewView.vue
 *
 * Route: /test-guidelines/:id/preview
 *
 * Full-page document preview for a test guideline, loaded via:
 *   FE → Node BE (/api/test-guidelines/:id/doc-gen-preview?lang=en)
 *      → Java API  (http://<JAVA_API_BASE>/doc-gen-preview/:id?lang=en)
 *
 * Renders the HTML response as A4-sized page cards, split on:
 *   - <div class="SectionN" style="page-break-before: always">
 *   - <br style="page-break-before: always">
 */
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button, Skeleton, useToast } from '@upov/upov-ui';
import { editorApi } from '@/services/editor-api';

const route  = useRoute();
const router = useRouter();
const toast  = useToast();

// ── Route param ───────────────────────────────────────────────────────────────
const tgId = ref<number>(Number(route.params.id));

// ── State ─────────────────────────────────────────────────────────────────────
const rawHtml     = ref<string | null>(null);
const loading     = ref(false);
const error       = ref<string | null>(null);

// ── Page splitting ────────────────────────────────────────────────────────────
/**
 * Splits the raw HTML string into page chunks.
 *
 * Strategy:
 *  1. Parse the full HTML into a temporary DOM container.
 *  2. Walk the children of <body> (or the root wrapper).
 *  3. Every time we encounter a node that carries `page-break-before: always`
 *     (Section divs) or a <br> with `page-break-before: always`, start a new
 *     page bucket.
 *  4. Return each bucket as an HTML string.
 */
const pages = computed<string[]>(() => {
  if (!rawHtml.value) return [];

  const parser  = new DOMParser();
  const doc     = parser.parseFromString(rawHtml.value, 'text/html');

  // The Java API wraps everything in a single <div class="SectionN"> or puts
  // content directly inside <body>. Grab all top-level children of <body>.
  const bodyChildren = Array.from(doc.body.childNodes);

  const buckets: Node[][] = [[]];

  for (const node of bodyChildren) {
    const el = node as Element;

    // Detect a hard page break:
    //  a) <br style="page-break-before:always"> — standalone break
    //  b) Any element whose inline style contains page-break-before:always
    //     (catches <div class="Section1" style="clear:both;page-break-before:always">)
    const style      = el.getAttribute?.('style') ?? '';
    const isPageBreakEl =
      el.tagName === 'BR' && /page-break-before\s*:\s*always/i.test(style);
    const isSection     =
      /page-break-before\s*:\s*always/i.test(style) && el.tagName !== 'BR';

    if (isPageBreakEl) {
      // The <br> itself is just a marker — skip it and start new page
      buckets.push([]);
    } else if (isSection) {
      // The section div starts a new page and is itself the first child of it
      buckets.push([node]);
    } else {
      buckets[buckets.length - 1].push(node);
    }
  }

  // Serialize each bucket back to HTML; filter out empty buckets
  const tmp = document.createElement('div');
  return buckets
    .filter(bucket => bucket.some(n => n.textContent?.trim()))
    .map(bucket => {
      tmp.innerHTML = '';
      bucket.forEach(n => tmp.appendChild(n.cloneNode(true)));
      return tmp.innerHTML;
    });
});

const pageCount = computed(() => pages.value.length);

// ── Load preview ──────────────────────────────────────────────────────────────
async function loadPreview() {
  if (!tgId.value) return;

  loading.value = true;
  error.value   = null;
  rawHtml.value = null;

  try {
    rawHtml.value = await editorApi.docGenPreview(tgId.value, 'en');
  } catch (err: any) {
    const message =
      err?.response?.data?.error?.message ||
      'Failed to load document preview. Please try again.';
    error.value = message;
    toast.show(message, { variant: 'error' });
    console.error('TgDocPreviewView load error:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(loadPreview);

// ── Navigation ────────────────────────────────────────────────────────────────
function backToDashboard() {
  router.push({ name: 'admin-test-guidelines' });
}
</script>

<template>
  <div class="preview-root">

    <!-- Top bar -->
    <div class="preview-topbar">
      <Button type="tertiary" icon-left="arrow-left" @click="backToDashboard">
        Back to TG Dashboard
      </Button>

      <span class="preview-topbar__title">Document Preview</span>

      <!-- Balancing spacer -->
      <div class="preview-topbar__spacer" />
    </div>

    <!-- ── Loading skeleton ── -->
    <div v-if="loading" class="skel">
      <div class="skel-page" v-for="n in 2" :key="n">
        <div class="skel-header">
          <Skeleton width="35%" height="20px" />
          <Skeleton width="55%" height="14px" />
          <Skeleton width="45%" height="14px" />
        </div>
        <div class="skel-body">
          <Skeleton v-for="i in 8" :key="i" width="100%" height="14px" />
          <Skeleton width="80%" height="14px" />
          <Skeleton width="60%" height="14px" />
        </div>
      </div>
    </div>

    <!-- ── Error state ── -->
    <div v-else-if="error" class="preview-error">
      <p>{{ error }}</p>
      <Button type="tertiary" icon-left="refresh" @click="loadPreview">
        Try again
      </Button>
    </div>

    <!-- ── Document pages ── -->
    <template v-else-if="pages.length">

      <!-- Page counter pill -->
      <div class="preview-meta">
        <span class="preview-meta__count">{{ pageCount }} page{{ pageCount !== 1 ? 's' : '' }}</span>
      </div>

      <!-- Scrollable page stack -->
      <div class="pages-scroll">
        <div
          v-for="(pageHtml, index) in pages"
          :key="index"
          class="page-sheet"
          :aria-label="`Page ${index + 1} of ${pageCount}`"
        >
          <!-- Page number badge -->
          <div class="page-badge">{{ index + 1 }}</div>

          <!-- Rendered document HTML -->
          <div class="page-content" v-html="pageHtml" />
        </div>
      </div>

    </template>

    <!-- ── Empty fallback ── -->
    <div v-else class="preview-error">
      <p>No preview available for this test guideline.</p>
    </div>

  </div>
</template>

<style scoped>
/* ── Reset ────────────────────────────────────────────────────────────────── */
.preview-root *, .preview-root *::before, .preview-root *::after { box-sizing: border-box; }
.preview-root h1, .preview-root h2, .preview-root h3, .preview-root p { margin: 0; padding: 0; }

/* ── Root shell ───────────────────────────────────────────────────────────── */
.preview-root {
  font-family: 'Figtree', sans-serif;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--color-neutral-800);
}

/* ── Top bar ──────────────────────────────────────────────────────────────── */
.preview-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.preview-topbar__title {
  flex: 1;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-primary-green-dark);
  white-space: nowrap;
}

.preview-topbar__spacer {
  flex: 0 0 auto;
  width: 170px;
}

/* ── Page count pill ──────────────────────────────────────────────────────── */
.preview-meta {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.preview-meta__count {
  display: inline-block;
  padding: 4px 14px;
  background: var(--color-neutral-100, #f3f4f6);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-neutral-500, #6b7280);
  letter-spacing: 0.02em;
}

/* ── Scrollable stack of pages ────────────────────────────────────────────── */
.pages-scroll {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 8px 16px 64px;
  overflow-y: auto;
}

/* ── Individual A4 page sheet ─────────────────────────────────────────────── */
/*
 * A4 at 96 dpi  ≈  794 × 1123 px.
 * We use a max-width so it scales nicely on smaller screens.
 */
.page-sheet {
  position: relative;
  width: 100%;
  max-width: 794px;
  min-height: 1123px;
  background: var(--color-neutral-0, #ffffff);
  border-radius: 4px;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.10),
    0 4px 16px rgba(0, 0, 0, 0.07);
  padding: 72px 80px 80px;
  flex-shrink: 0;
}

/* ── Page number badge ────────────────────────────────────────────────────── */
.page-badge {
  position: absolute;
  top: -11px;
  right: 16px;
  background: var(--color-primary-green-dark, #15803d);
  color: #fff;
  font-family: 'Figtree', sans-serif;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  padding: 4px 9px;
  border-radius: 999px;
  letter-spacing: 0.04em;
  user-select: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
}

/* ── Document content styles ──────────────────────────────────────────────── */
/* The Java/Java-generated HTML uses inline styles heavily, but we add sensible
   base typography so the document looks clean inside each page sheet.        */
.page-content {
  font-family: Arial, sans-serif;
  font-size: 10pt;
  line-height: 1.6;
  color: var(--color-neutral-900, #111827);
  word-wrap: break-word;
  overflow: hidden;
}

/* Suppress any leftover CSS page-break declarations inside rendered HTML —
   we already handle page splitting ourselves.                                */
:deep(.page-content) * {
  page-break-before: auto !important;
  page-break-after: auto !important;
  break-before: auto !important;
  break-after: auto !important;
}

:deep(.page-content) br[style*="page-break"] {
  display: none !important;
}

/* Tables */
:deep(.page-content) table {
  border-collapse: collapse;
  width: 100%;
  margin: 0.5em 0;
}

:deep(.page-content) td,
:deep(.page-content) th {
  vertical-align: top;
  padding: 4px 6px;
}

/* Images — keep within page width */
:deep(.page-content) img {
  max-width: 100%;
  height: auto;
}

/* Headings — honour inline colour but cap font size */
:deep(.page-content) h1,
:deep(.page-content) h2,
:deep(.page-content) h3,
:deep(.page-content) h4 {
  line-height: 1.3;
  margin: 0.8em 0 0.3em;
}

/* Paragraphs */
:deep(.page-content) p {
  margin: 0.3em 0;
}

/* Lists */
:deep(.page-content) ul,
:deep(.page-content) ol {
  padding-left: 1.4em;
  margin: 0.3em 0;
}

/* ── Loading skeleton ─────────────────────────────────────────────────────── */
.skel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
  padding: 8px 16px;
}

.skel-page {
  width: 100%;
  max-width: 794px;
  background: var(--color-neutral-0, #fff);
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.10), 0 4px 16px rgba(0, 0, 0, 0.07);
  padding: 72px 80px;
}

.skel-header {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 36px;
}

.skel-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Error state ──────────────────────────────────────────────────────────── */
.preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 64px 0;
  color: var(--color-danger, #D32F2F);
  font-size: 15px;
  text-align: center;
}

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 860px) {
  .page-sheet,
  .skel-page {
    padding: 40px 32px;
  }
}

@media (max-width: 640px) {
  .page-sheet,
  .skel-page {
    padding: 24px 18px;
    min-height: unset;
  }

  .preview-topbar__spacer {
    display: none;
  }

  .preview-topbar__title {
    text-align: left;
  }

  .pages-scroll {
    padding: 8px 8px 48px;
    gap: 20px;
  }
}
</style>