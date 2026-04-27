import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { editorApi } from '@/services/editor-api';
import type {
  TgHeader,
  UpovCode,
  ChapterMeta,
  Paragraph,
  EditorLookups,
  ExaminationPropMethod,
  AssessmentPropMethod,
} from '@/types/editor';

export const useEditorStore = defineStore('editor', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const tgId = ref<number | null>(null);
  const tg = ref<TgHeader | null>(null);
  const upovCodes = ref<UpovCode[]>([]);
  const chapters = ref<Record<string, any>>({});
  const paragraphs = ref<Paragraph[]>([]);
  const propagationMethods = ref<{
    examination: ExaminationPropMethod[];
    assessment: AssessmentPropMethod[];
  }>({ examination: [], assessment: [] });
  const lookups = ref<EditorLookups | null>(null);
  const canEdit = ref(false);
  const permission = ref<'edit' | 'comment' | 'signoff' | 'readOnly'>('readOnly');
  const loading = ref(true);
  const error = ref<string | null>(null);
  const dirty = ref<Set<string>>(new Set());
  const saveStatus = ref<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const lastSaveError = ref<string | null>(null);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const activeChapterIndex = ref(0);
  const chapterNavCollapsed = ref(false);

  const chapterList: ChapterMeta[] = [
    { number: '00', sidebarTitle: 'Cover page', pageTitle: 'Cover Page', stepperLabel: 'C' },
    { number: '01', sidebarTitle: 'Subject', pageTitle: 'Subject of these Test Guidelines' },
    { number: '02', sidebarTitle: 'Material', pageTitle: 'Material Required' },
    { number: '03', sidebarTitle: 'Examination', pageTitle: 'Method of Examination' },
    { number: '04', sidebarTitle: 'Assessment', pageTitle: 'Assessment of Distinctness, Uniformity and Stability' },
    { number: '05', sidebarTitle: 'Grouping', pageTitle: 'Grouping of Varieties' },
    { number: '06', sidebarTitle: 'Characteristics', pageTitle: 'Characteristics' },
    { number: '07', sidebarTitle: 'Table of characteristics', pageTitle: 'Table of Characteristics' },
    { number: '08', sidebarTitle: 'Explanations', pageTitle: 'Explanations' },
    { number: '09', sidebarTitle: 'Literature', pageTitle: 'Literature' },
    { number: '10', sidebarTitle: 'Technical questionnaire', pageTitle: 'Technical Questionnaire' },
    { number: '11', sidebarTitle: 'Annex', pageTitle: 'Annex', stepperLabel: 'A' },
  ];

  const activeChapter = computed(() => chapterList[activeChapterIndex.value]);
  const activeChapterNumber = computed(() => Number(activeChapter.value.number));
  const activeChapterTitle = computed(() => activeChapter.value.pageTitle);
  const currentTgId = computed(() => tgId.value);

  // ── API ────────────────────────────────────────────────────────────────────
  async function load(id: number) {
    loading.value = true;
    error.value = null;
    tgId.value = id;
    try {
      const res = await editorApi.open(id);
      canEdit.value = res.canEdit;
      permission.value = res.permission || 'readOnly';
      tg.value = res.tg;
      upovCodes.value = res.upovCodes;
      chapters.value = res.chapters;
      paragraphs.value = res.paragraphs;
      propagationMethods.value = res.propagationMethods;
      lookups.value = res.lookups;
    } catch (err: any) {
      console.error('Editor load error:', err);
      error.value = err?.response?.data?.error?.message || 'Failed to load editor data';
    } finally {
      loading.value = false;
    }
  }

  // ── Autosave ───────────────────────────────────────────────────────────────
  let autosaveTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  let savedTimer: ReturnType<typeof setTimeout> | null = null;

  function autosave(chapter: string, field: string, value: any) {
    const key = `${chapter}.${field}`;

    // Optimistic update
    // Chapter 00 fields (TG_Name, Name_AssoDocInfo) live on the tg header, not a chapters sub-object
    if (chapter === '00') {
      if (tg.value) (tg.value as any)[field] = value;
    } else if (chapters.value[chapter]) {
      chapters.value[chapter][field] = value;
    }
    dirty.value.add(key);

    // Debounce — clear previous timer for this field
    if (autosaveTimers[key]) {
      clearTimeout(autosaveTimers[key]);
    }

    autosaveTimers[key] = setTimeout(async () => {
      saveStatus.value = 'saving';
      lastSaveError.value = null;
      try {
        await editorApi.patchChapter(tgId.value!, chapter, { [field]: value });
        dirty.value.delete(key);
        // Update local timestamp so the UI reflects the latest save time
        // Store as ISO string in UTC (backend with timezone: 'Z' returns this format)
        if (tg.value) {
          tg.value.TG_lastupdated = new Date().toISOString();
        }
        // Only show "saved" when all pending saves are done
        if (dirty.value.size === 0) {
          saveStatus.value = 'saved';
          if (savedTimer) clearTimeout(savedTimer);
          savedTimer = setTimeout(() => { saveStatus.value = 'idle'; }, 2000);
        }
      } catch (err: any) {
        console.error(`Autosave failed for ${key}:`, err);
        dirty.value.delete(key);
        saveStatus.value = 'error';
        lastSaveError.value = err?.response?.data?.error?.message || `Failed to save ${field}`;
      }
    }, 500);
  }

  function dismissSaveError() {
    saveStatus.value = 'idle';
    lastSaveError.value = null;
  }

  // ── Paragraphs (shared across chapters) ────────────────────────────────────
  async function addParagraph(_chapter?: number) {
    const result = await editorApi.createParagraph(tgId.value!, {
      Sub_Add_Info: '',
    });
    paragraphs.value.push(result);
    // Update timestamp after paragraph creation
    if (tg.value) {
      tg.value.TG_lastupdated = new Date().toISOString();
    }
    return result;
  }

  async function updateParagraph(id: number, content: string) {
    await editorApi.updateParagraph(tgId.value!, id, { Sub_Add_Info: content });
    const p = paragraphs.value.find((p) => p.Sub_Add_Id === id);
    if (p) p.Sub_Add_Info = content;
    // Update timestamp after paragraph update
    if (tg.value) {
      tg.value.TG_lastupdated = new Date().toISOString();
    }
  }

  async function removeParagraph(id: number) {
    await editorApi.deleteParagraph(tgId.value!, id);
    paragraphs.value = paragraphs.value.filter((p) => p.Sub_Add_Id !== id);
    // Update timestamp after paragraph deletion
    if (tg.value) {
      tg.value.TG_lastupdated = new Date().toISOString();
    }
  }

  // ── Navigation actions ─────────────────────────────────────────────────────
  function goToChapter(index: number) {
    activeChapterIndex.value = index;
  }

  function goNext() {
    if (activeChapterIndex.value < chapterList.length - 1) activeChapterIndex.value++;
  }

  function goPrevious() {
    if (activeChapterIndex.value > 0) activeChapterIndex.value--;
  }

  function toggleChapterNav() {
    chapterNavCollapsed.value = !chapterNavCollapsed.value;
  }

  return {
    // State
    tgId,
    currentTgId,
    canEdit,
    permission,
    tg,
    upovCodes,
    chapters,
    paragraphs,
    propagationMethods,
    lookups,
    loading,
    error,
    dirty,
    saveStatus,
    lastSaveError,
    // Navigation
    activeChapterIndex,
    chapterNavCollapsed,
    chapterList,
    activeChapter,
    activeChapterNumber,
    activeChapterTitle,
    // Actions
    load,
    autosave,
    dismissSaveError,
    addParagraph,
    updateParagraph,
    removeParagraph,
    goToChapter,
    goNext,
    goPrevious,
    toggleChapterNav,
  };
});