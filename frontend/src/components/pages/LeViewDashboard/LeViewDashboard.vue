<script setup lang="ts">

import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Editor from '@tinymce/tinymce-vue';

import ChapterSubject               from './chapters/Chaptersubject.vue';
import ChapterMaterial              from './chapters/Chaptermaterial.vue';
import ChapterExamination           from './chapters/Chapterexamination.vue';
import ChapterTableOfCharacteristics from './chapters/Chaptertableofcharacteristics.vue';

import { useConfigStore } from '@/stores/config';
import type { ChapterItem, RelatedLink } from './chapters/types';

// ── Router ────────────────────────────────────────────────────────────────────
const route  = useRoute();
const router = useRouter();
const tgId   = route.params.id;
console.log('TG ID:', tgId);

// ── TinyMCE ───────────────────────────────────────────────────────────────────
const tinymceApiKey = useConfigStore().config?.tinymce.apiKey ?? '';

const tinymceInit = {
  height: 300,
  
  menubar: false,
  branding: false,
  plugins: 'code insertdatetime advlist charmap preview anchor searchreplace visualblocks fullscreen help a11ychecker advcode casechange export formatpainter linkchecker autolink lists checklist media mediaembed pageembed permanentpen powerpaste table advtable tinymcespellchecker image link',
  toolbar: 'help a11ycheck casechange checklist code export formatpainter pageembed permanentpen table image',
  toolbar_mode: 'floating',
  force_br_newlines: true,
  relative_urls: false,
  remove_script_host: false,
  images_file_types: 'jpeg,jpg,jpe,jfi,jif,jfif,png,gif,bmp,webp',
  images_upload_handler: function (blobInfo: { blob: () => Blob; filename: () => string }, progress: (percent: number) => void) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.withCredentials = false;
      xhr.open('POST', 'fileUpload.upov', false);
      xhr.upload.onprogress = (e) => { progress(e.loaded / e.total * 100); };
      xhr.onload = () => {
        if (xhr.status !== 200) { reject('HTTP Error: ' + xhr.status); return; }
        resolve(xhr.responseText);
      };
      xhr.onerror = () => { reject('Image upload failed. Code: ' + xhr.status); };
      const formData = new FormData();
      formData.append('upload', blobInfo.blob(), (new Date()).getTime() + blobInfo.filename());
      xhr.send(formData);
    });
  },
  content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
  file_picker_types: 'image',
  file_picker_callback: function (cb: (url: string, meta: { title: string }) => void) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.onchange = function (this: HTMLInputElement) {
      const file = this.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        const id = 'blobid' + (new Date()).getTime();
        const tinymceWindow = window as typeof window & { tinymce: { activeEditor: { editorUpload: { blobCache: { create: (id: string, file: File, base64: string) => { blobUri: () => string }; add: (blobInfo: unknown) => void } } } } };
        const blobCache = tinymceWindow.tinymce.activeEditor.editorUpload.blobCache;
        const base64    = (reader.result as string).split(',')[1];
        const blobInfo  = blobCache.create(id, file, base64);
        blobCache.add(blobInfo);
        cb(blobInfo.blobUri(), { title: file.name });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  },
};

// ── Props ─────────────────────────────────────────────────────────────────────
withDefaults(defineProps<{
  mainCommonName?: string;
  upovCodes?: string;
  botanicalName?: string;
  relatedLinks?: RelatedLink[];
  documentName?: string;
  savedDate?: string;
}>(), {
  mainCommonName: 'European Pear',
  upovCodes: 'PYRUS_COM; PYRUS_BCO; PYRUS_CPB; PYRUS_CUS',
  botanicalName: 'Pyrus communis L., Pyrus asiae-mediae (Popov) Maleev, Pyrus balansae Decne.',
  relatedLinks: () => [
    { text: 'Quantity of plant material required (GN7)', url: '#' },
    { text: 'Quantity of plant material required (GN6)', url: '#' },
  ],
  documentName: 'TG/export_test_2',
  savedDate: 'Saved: 02 Dec, 2025 - 31 Dec, 2025',
});

// ── Emits ─────────────────────────────────────────────────────────────────────
const emit = defineEmits<{
  submit: [];
  export: [];
  previousChapter: [];
  nextChapter: [];
  itemClick: [item: ChapterItem];
}>();

// ── Header card state ─────────────────────────────────────────────────────────
const showDetails          = ref(false);
const upovDocumentsContent = ref('');

function toggleDetails() { showDetails.value = !showDetails.value; }

// ── Chapter sidebar state ─────────────────────────────────────────────────────
const chapterNavCollapsed = ref(false);
const activeChapterIndex  = ref(0);
const navigationLocked    = false;

const chapters: ChapterItem[] = [
  { number: '01', sidebarTitle: 'Subject',                  pageTitle: 'Subject of these Test Guidelines',                    status: 'current' },
  { number: '02', sidebarTitle: 'Material',                 pageTitle: 'Material Required',                                   status: 'pending' },
  { number: '03', sidebarTitle: 'Examination',              pageTitle: 'Method of Examination',                               status: 'pending' },
  { number: '04', sidebarTitle: 'Assessment',               pageTitle: 'Assessment of Distinctness, Uniformity and Stability', status: 'pending' },
  { number: '05', sidebarTitle: 'Grouping',                 pageTitle: 'Grouping of Varieties',                               status: 'pending' },
  { number: '06', sidebarTitle: 'Characteristics',          pageTitle: 'Characteristics',                                     status: 'pending' },
  { number: '07', sidebarTitle: 'Table of characteristics', pageTitle: 'Table of Characteristics',                            status: 'pending' },
  { number: '08', sidebarTitle: 'Explanations',             pageTitle: 'Explanations',                                        status: 'pending' },
  { number: '09', sidebarTitle: 'Literature',               pageTitle: 'Literature',                                          status: 'pending' },
  { number: '10', sidebarTitle: 'Technical questionnaire',  pageTitle: 'Technical Questionnaire',                             status: 'pending' },
  { number: '11', sidebarTitle: 'Annex',                    pageTitle: 'Annex',                                               status: 'pending' },
];

const activeChapter = computed(() => chapters[activeChapterIndex.value]);

function setActiveChapter(index: number) {
  if (navigationLocked) return;
  activeChapterIndex.value = index;
  emit('itemClick', chapters[index]);
}

function toggleChapterNav() { chapterNavCollapsed.value = !chapterNavCollapsed.value; }

function goNext() {
  if (navigationLocked || activeChapterIndex.value >= chapters.length - 1) return;
  activeChapterIndex.value++;
  emit('nextChapter');
}

function goPrevious() {
  if (navigationLocked || activeChapterIndex.value <= 0) return;
  activeChapterIndex.value--;
  emit('previousChapter');
}

function backToDashboard() {
  router.push({ name: 'tg-twp-drafts' });
}
</script>

<template>
  <div class="lvd-root">

    <!-- ── Back button ──────────────────────────────────────────────────────── -->
    <div class="lvd-action-row">
      <button class="lvd-back-btn" @click="backToDashboard">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11.25 13.5L6.75 9L11.25 4.5" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Back to TG Dashboard
      </button>
    </div>

    <!-- ── Header card ──────────────────────────────────────────────────────── -->
    <div class="lvd-header-card">

      <div class="lvd-hc-top">
        <div class="lvd-hc-meta">
          <div class="lvd-hc-name-block">
            <span class="lvd-meta-label">Main Common Name(s):</span>
            <span class="lvd-meta-name">{{ mainCommonName }}</span>
          </div>
          <div class="lvd-hc-code-block">
            <span class="lvd-meta-label">UPOV Code(s):</span>
            <span class="lvd-meta-code">{{ upovCodes }}</span>
          </div>
        </div>
        <button class="lvd-submit-btn" @click="emit('submit')">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 1.5C4.858 1.5 1.5 4.858 1.5 9S4.858 16.5 9 16.5 16.5 13.142 16.5 9 13.142 1.5 9 1.5Z" stroke="#DADE14" stroke-width="1.5"/>
            <path d="M6 9l2.25 2.25L12 6.75" stroke="#DADE14" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Submit
        </button>
      </div>

      <!-- Expandable details -->
      <Transition name="lvd-slide">
        <div v-if="showDetails" class="lvd-hc-details">
          <div class="lvd-botanical-row">
            <span class="lvd-meta-label">Botanical Name(s):</span>
            <p class="lvd-botanical-text">{{ botanicalName }}</p>
            <div class="lvd-links-row">
              <span class="lvd-links-label">Related links:</span>
              <a v-for="(link, i) in relatedLinks" :key="i" :href="link.url || '#'" target="_blank" class="lvd-link">
                {{ link.text }}
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M4.875 2.438H2.438A1.063 1.063 0 0 0 1.375 3.5v7.063A1.063 1.063 0 0 0 2.438 11.624H9.5a1.063 1.063 0 0 0 1.063-1.062V8.125M7.813 1.375H11.625M11.625 1.375V5.188M11.625 1.375L4.875 8.125" stroke="#1C4240" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </a>
            </div>
          </div>
          <div class="lvd-docs-row">
            <span class="lvd-meta-label">Please indicate other associated UPOV documents:</span>
            <div class="lvd-rte-tinymce">
              <Editor v-model="upovDocumentsContent" :api-key="tinymceApiKey" :init="tinymceInit" />
            </div>
          </div>
        </div>
      </Transition>

      <div class="lvd-hc-bottom">
        <button class="lvd-toggle-btn" @click="toggleDetails">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path v-if="showDetails" d="M4.5 11.25L9 6.75L13.5 11.25" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path v-else d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          {{ showDetails ? 'Less details' : 'More details' }}
        </button>
        <div class="lvd-save-info">
          <span class="lvd-save-doc">{{ documentName }}</span>
          <span class="lvd-save-date">{{ savedDate }}</span>
        </div>
      </div>
    </div>

    <!-- ── Content area ─────────────────────────────────────────────────────── -->
    <div class="lvd-content-area">

      <!-- Chapter sidebar -->
      <aside class="lvd-stepper" :class="{ 'lvd-stepper--collapsed': chapterNavCollapsed }">
        <span v-show="!chapterNavCollapsed" class="lvd-stepper-heading">Chapters</span>
        <ul class="lvd-stepper-list">
          <li
            v-for="(ch, idx) in chapters"
            :key="ch.number"
            class="lvd-step"
            :class="{
              'lvd-step--current': idx === activeChapterIndex,
              'lvd-step--pending': idx !== activeChapterIndex,
            }"
            @click="setActiveChapter(idx)"
          >
            <span class="lvd-step-num" :class="{ 'lvd-step-num--active': idx === activeChapterIndex }">
              {{ ch.number }}
            </span>
            <span v-show="!chapterNavCollapsed" class="lvd-step-title">{{ ch.sidebarTitle }}</span>
          </li>
        </ul>
        <button class="lvd-collapse-btn" @click="toggleChapterNav">
          <svg v-if="chapterNavCollapsed" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M5.47 16.28a.75.75 0 0 1 0-1.06L11.69 9 5.47 2.78a.75.75 0 1 1 1.06-1.06l6.75 6.75a.75.75 0 0 1 0 1.06l-6.75 6.75a.75.75 0 0 1-1.06 0Z" fill="#1C4240"/>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12.53 1.72a.75.75 0 0 1 0 1.06L6.31 9l6.22 6.22a.75.75 0 1 1-1.06 1.06l-6.75-6.75a.75.75 0 0 1 0-1.06l6.75-6.75a.75.75 0 0 1 1.06 0Z" fill="#1C4240"/>
          </svg>
          <span v-show="!chapterNavCollapsed" class="lvd-collapse-label">Collapse</span>
        </button>
      </aside>

      <!-- Main chapter content -->
      <main class="lvd-main">
        <h1 class="lvd-section-heading">
          {{ Number(activeChapter.number) }}. {{ activeChapter.pageTitle }}
        </h1>

        <!-- Chapter 01 – Subject (default for all unmapped chapters too) -->
        <ChapterSubject v-if="activeChapterIndex === 0" />

        <!-- Chapter 02 – Material -->
        <ChapterMaterial v-else-if="activeChapterIndex === 1" />

        <!-- Chapter 03 – Examination -->
        <ChapterExamination v-else-if="activeChapterIndex === 2" />

        <!-- Chapter 07 – Table of Characteristics -->
        <ChapterTableOfCharacteristics v-else-if="activeChapterIndex === 6" />

        <!-- Fallback for chapters 04–06, 08–11 (not yet implemented) -->
        <ChapterSubject v-else />
      </main>
    </div>

    <!-- ── Footer ───────────────────────────────────────────────────────────── -->
    <footer class="lvd-footer">
      <button class="lvd-footer-btn" @click="emit('export')">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1.5 12.75V14.25C1.5 15.075 2.175 15.75 3 15.75H15C15.825 15.75 16.5 15.075 16.5 14.25V12.75M12.75 9L9 12.75M9 12.75L5.25 9M9 12.75V2.25" stroke="#1C4240" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <span class="lvd-footer-btn-text">Export</span>
      </button>
      <div class="lvd-footer-nav">
        <button v-if="activeChapterIndex > 0" class="lvd-footer-btn" @click="goPrevious">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M11.25 13.5L6.75 9L11.25 4.5" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="lvd-footer-btn-text">Previous chapter</span>
        </button>
        <button v-if="activeChapterIndex < chapters.length - 1" class="lvd-footer-btn" @click="goNext">
          <span class="lvd-footer-btn-text">Next chapter</span>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M6.75 13.5L11.25 9L6.75 4.5" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </footer>

  </div>
</template>

<style scoped>
/* ── Reset ─────────────────────────────────────────────────────────────────── */
.lvd-root *, .lvd-root *::before, .lvd-root *::after { box-sizing: border-box; }
.lvd-root h1, .lvd-root h2, .lvd-root h3, .lvd-root p, .lvd-root ul { margin: 0; padding: 0; }
.lvd-root ul     { list-style: none; }
.lvd-root a      { color: inherit; }
.lvd-root button { font-family: 'Figtree', 'Segoe UI', Arial, sans-serif; cursor: pointer; }

.lvd-root {
  font-family: 'Figtree', sans-serif;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: #303030;
}

/* ── Back button ───────────────────────────────────────────────────────────── */
.lvd-action-row { display: flex; align-items: center; justify-content: space-between; }
.lvd-back-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #1C4240; text-decoration: underline; text-decoration-color: #DADE14; text-decoration-thickness: 2px; text-underline-offset: 3px; padding: 4px 0; transition: opacity 0.15s; }
.lvd-back-btn:hover { opacity: 0.7; }

/* ── Header card ───────────────────────────────────────────────────────────── */
.lvd-header-card { width: 100%; background: #FFFFFF; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
.lvd-hc-top { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; gap: 24px; border-bottom: 1px solid #E2E2E2; }
.lvd-hc-meta { display: flex; align-items: flex-start; gap: 48px; flex: 1; flex-wrap: wrap; }
.lvd-hc-name-block, .lvd-hc-code-block { display: flex; flex-direction: column; gap: 4px; }
.lvd-meta-label { font-size: 14px; font-weight: 400; color: #727272; line-height: 18px; }
.lvd-meta-name  { font-size: 22px; font-weight: 700; color: #1C4240; line-height: 27px; }
.lvd-meta-code  { font-size: 16px; font-weight: 600; color: #1C4240; line-height: 20px; }
.lvd-submit-btn { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 20px; background: #1C4240; color: #DADE14; font-size: 15px; font-weight: 600; border: none; border-radius: 100px; cursor: pointer; flex-shrink: 0; transition: opacity 0.15s, transform 0.1s; }
.lvd-submit-btn:hover  { opacity: 0.88; }
.lvd-submit-btn:active { transform: scale(0.97); }

.lvd-hc-details { padding: 16px 20px; border-bottom: 1px solid #E2E2E2; display: flex; flex-direction: column; gap: 20px; }
.lvd-botanical-row  { display: flex; flex-direction: column; gap: 6px; }
.lvd-botanical-text { font-weight: 700; font-size: 15px; line-height: 20px; color: #1C4240; }
.lvd-links-row  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.lvd-links-label { font-size: 13px; font-weight: 400; color: #303030; white-space: nowrap; }
.lvd-link { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: #1C4240; text-decoration: underline; text-decoration-color: #DADE14; text-decoration-thickness: 2px; text-underline-offset: 2px; cursor: pointer; transition: opacity 0.15s; }
.lvd-link:hover { opacity: 0.7; }
.lvd-docs-row { display: flex; flex-direction: column; gap: 6px; }

.lvd-rte-tinymce :deep(.tox-tinymce) { border: 1px solid #1C4240 !important; border-radius: 4px !important; }
.lvd-rte-tinymce :deep(.tox-toolbar__primary) { background: #FFFFFF !important; border-bottom: 1px solid #E2E2E2 !important; }
.lvd-rte-tinymce :deep(.tox-toolbar-overlord) { background: #FFFFFF !important; }
.lvd-rte-tinymce :deep(.tox .tox-tbtn svg) { fill: #1C4240 !important; }
.lvd-rte-tinymce :deep(.tox .tox-tbtn:hover) { background: rgba(28,66,64,0.06) !important; }
.lvd-rte-tinymce :deep(.tox .tox-statusbar) { border-top: 1px solid #E2E2E2 !important; }
.lvd-rte-tinymce :deep(.tox-statusbar__branding) { display: none; }

.lvd-hc-bottom { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; }
.lvd-toggle-btn { display: inline-flex; align-items: center; gap: 6px; background: none; border: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #1C4240; text-decoration: underline; text-decoration-color: #DADE14; text-decoration-thickness: 2px; text-underline-offset: 3px; padding: 0; transition: opacity 0.15s; }
.lvd-toggle-btn:hover { opacity: 0.7; }
.lvd-save-info { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.lvd-save-doc  { font-size: 13px; font-weight: 600; color: #727272; }
.lvd-save-date { font-size: 12px; font-weight: 400; color: #727272; }

/* ── Content area ──────────────────────────────────────────────────────────── */
.lvd-content-area { display: flex; align-items: flex-start; gap: 24px; }

/* ── Chapter sidebar ───────────────────────────────────────────────────────── */
.lvd-stepper { display: flex; flex-direction: column; gap: 8px; width: 160px; flex-shrink: 0; border-right: 1px solid #E2E2E2; transition: width 0.25s cubic-bezier(0.4,0,0.2,1); overflow: hidden; }
.lvd-stepper--collapsed { width: 52px; }
.lvd-stepper-heading { display: block; font-size: 15px; font-weight: 600; color: #303030; padding: 0 8px 4px; white-space: nowrap; transition: opacity 0.15s ease; }
.lvd-stepper--collapsed .lvd-stepper-heading { opacity: 0; }
.lvd-stepper-list { display: flex; flex-direction: column; }

.lvd-step { display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 6px 8px; cursor: pointer; position: relative; transition: background 0.12s; border-radius: 4px 0 0 4px; }
.lvd-step:hover { background: rgba(226,238,235,0.6); }
.lvd-step--current { background: #E2EEEB; }
.lvd-step--current::after { content: ''; position: absolute; right: 0; top: 5px; bottom: 5px; width: 2px; background: #009A6E; border-radius: 2px; }
.lvd-step--current .lvd-step-title { color: #009A6E; font-weight: 700; }

.lvd-step-num { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 13px; font-weight: 500; color: #1C4240; background: #FFFFFF; border: 1.5px solid #939600; }
.lvd-step-num--active { background: #009A6E; border-color: #009A6E; color: #FFFFFF; font-weight: 700; }
.lvd-step-title { font-size: 13px; font-weight: 500; color: #1C4240; white-space: normal; flex: 1; min-width: 0; transition: opacity 0.15s ease; }
.lvd-stepper--collapsed .lvd-step-title { opacity: 0; }

.lvd-collapse-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px; background: none; border: none; cursor: pointer; transition: opacity 0.15s; }
.lvd-collapse-btn:hover { opacity: 0.7; }
.lvd-collapse-label { font-size: 13px; font-weight: 600; color: #1C4240; text-decoration: underline; text-decoration-color: #DADE14; text-decoration-thickness: 2px; text-underline-offset: 2px; white-space: nowrap; transition: opacity 0.15s ease; }
.lvd-stepper--collapsed .lvd-collapse-label { opacity: 0; }

/* ── Main ──────────────────────────────────────────────────────────────────── */
.lvd-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 20px; }
.lvd-section-heading { font-size: 22px; font-weight: 700; color: #1C4240; line-height: 27px; }

/* ── Footer ────────────────────────────────────────────────────────────────── */
.lvd-footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 0 0; border-top: 1px solid #D0D0D0; margin-top: auto; }
.lvd-footer-nav { display: flex; align-items: center; gap: 16px; }
.lvd-footer-btn { display: inline-flex; align-items: center; gap: 6px; height: 32px; padding: 0 10px; background: transparent; border: none; border-radius: 100px; cursor: pointer; transition: background 0.15s; }
.lvd-footer-btn:hover { background: rgba(28,66,64,0.06); }
.lvd-footer-btn-text { font-size: 14px; font-weight: 600; color: #1C4240; text-decoration: underline; text-decoration-color: #DADE14; text-decoration-thickness: 2px; text-underline-offset: 3px; }

/* ── Transitions ───────────────────────────────────────────────────────────── */
.lvd-slide-enter-active, .lvd-slide-leave-active { transition: max-height 0.3s ease, opacity 0.25s ease; overflow: hidden; max-height: 700px; }
.lvd-slide-enter-from, .lvd-slide-leave-to { max-height: 0; opacity: 0; }
</style>