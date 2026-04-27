<script setup lang="ts">
import { ref, computed } from 'vue';
import CharacteristicsModal from './Characteristics.vue';
import type { TocCharacteristic, TocSearchResult, CharacteristicForm } from './types';

// ── Search state ──────────────────────────────────────────────────────────────
const tocSearchQuery   = ref('');
const tocSearchResults = ref<TocSearchResult[]>([]);
const tocSearchDone    = ref(false);

// All possible results to search from
const allResults: TocSearchResult[] = [
  { id: 'sr-1', name: 'Young leaf blade: main color', genus: 'ABELIA', methods: 'VG', type: 'PQ', tgRef: 'TG/320/1', statesOfExpression: 'Very short/1, short/2, medium/3, long/4, very long/5' },
  { id: 'sr-2', name: 'Young leaf blade: shape',      genus: 'ABELIA', methods: 'VG', type: 'PQ', tgRef: 'TG/320/1', statesOfExpression: 'Very short/1, short/2, medium/3, long/4, very long/5' },
  { id: 'sr-3', name: 'Young leaf blade: height',     genus: 'ABELIA', methods: 'VG', type: 'PQ', tgRef: 'TG/320/1', statesOfExpression: 'Very short/1, short/2, medium/3, long/4, very long/5' },
];

function tocSearch() {
  if (!tocSearchQuery.value.trim()) return;
  tocSearchResults.value = allResults.filter(r =>
    r.name.toLowerCase().includes(tocSearchQuery.value.toLowerCase())
  );
  tocSearchDone.value = true;
}

function tocClearSearch() {
  tocSearchQuery.value  = '';
  tocSearchResults.value = [];
  tocSearchDone.value   = false;
}

function tocImport(result: TocSearchResult) {
  const newChar: TocCharacteristic = {
    id:       `toc-imported-${Date.now()}`,
    num:      tocCharacteristics.value.length + 1,
    type:     result.type,
    method:   result.methods,
    asterisk: false,
    title:    result.name,
    rows:     result.statesOfExpression.split(',').map((s, i) => ({
      english:          s.trim().split('/')[0],
      exampleVarieties: '',
      notes:            i + 1,
    })),
  };
  tocCharacteristics.value.push(newChar);
  tocSearchResults.value = tocSearchResults.value.filter(r => r.id !== result.id);
}

// ── Characteristics list ──────────────────────────────────────────────────────
const tocCharacteristics = ref<TocCharacteristic[]>([
  {
    id: 'toc-1', num: 1, type: 'QN', method: 'MG/VG', asterisk: false,
    title: 'Tree: vigor',
    rows: [
      { english: 'very weak',            exampleVarieties: "Grenadier, Nield's Drooper", notes: 1 },
      { english: 'very weak to weak',    exampleVarieties: 'James Grieve, Redkan',       notes: 2 },
      { english: 'weak',                 exampleVarieties: 'Alkmene, Regine',            notes: 3 },
      { english: 'weak to medium',       exampleVarieties: 'Piros, Pomforyou, Renora',   notes: 4 },
      { english: 'medium',               exampleVarieties: 'Gala, Pinova, Trajan',       notes: 5 },
      { english: 'medium to strong',     exampleVarieties: 'Dalili, Pia, Pivita',        notes: 6 },
      { english: 'strong',               exampleVarieties: 'Elstar, Rafzubin, Santana',  notes: 7 },
      { english: 'strong to very strong', exampleVarieties: 'Bay 3484, Collina, Cripps Pink', notes: 8 },
      { english: 'very strong',          exampleVarieties: 'Gloster, Ingrid Marie',      notes: 9 },
    ],
  },
  {
    id: 'toc-2', num: 2, type: 'QL', method: 'VG', asterisk: true,
    title: 'Tree: type',
    rows: [
      { english: 'columnar', exampleVarieties: 'MacExcel, Wijcik',         notes: 1 },
      { english: 'ramified', exampleVarieties: 'Elstar, Golden Delicious', notes: 2 },
    ],
  },
  {
    id: 'toc-3', num: 3, type: 'QN', method: 'MG/VG', asterisk: true,
    title: 'Leaf: length',
    rows: [
      { english: 'very short', exampleVarieties: 'Kasumi',    notes: 1 },
      { english: 'medium',     exampleVarieties: '',          notes: 2 },
      { english: '5',          exampleVarieties: 'variety B', notes: 3 },
    ],
  },
  {
    id: 'toc-4', num: 4, type: 'QL', method: 'MS', asterisk: false,
    title: 'resistance test',
    rows: [
      { english: 'absent',  exampleVarieties: '', notes: 1 },
      { english: 'present', exampleVarieties: '', notes: 9 },
    ],
  },
  {
    id: 'toc-5', num: 5, type: 'QL', method: 'MS', asterisk: false,
    title: 'Young leaf blade: main color',
    rows: [
      { english: 'absent', exampleVarieties: '', notes: 1 },
    ],
  },
]);

// ── Pagination ────────────────────────────────────────────────────────────────
const displayedCount = ref(4);
const tocDisplayed = computed(() => tocCharacteristics.value.slice(0, displayedCount.value));

function loadMore() {
  displayedCount.value = Math.min(displayedCount.value + 3, tocCharacteristics.value.length);
}

// ── Delete ────────────────────────────────────────────────────────────────────
function tocDeleteCharacteristic(id: string) {
  tocCharacteristics.value = tocCharacteristics.value.filter(c => c.id !== id);
  tocCharacteristics.value.forEach((c, i) => { c.num = i + 1; });
}

// ── Drag-to-reorder ───────────────────────────────────────────────────────────
const dragSrcIndex = ref<number | null>(null);

function tocDragStart(index: number) { dragSrcIndex.value = index; }
function tocDragOver(e: DragEvent)   { e.preventDefault(); }

function tocDrop(targetIndex: number) {
  if (dragSrcIndex.value === null || dragSrcIndex.value === targetIndex) return;
  const items = [...tocCharacteristics.value];
  const [moved] = items.splice(dragSrcIndex.value, 1);
  items.splice(targetIndex, 0, moved);
  items.forEach((c, i) => { c.num = i + 1; });
  tocCharacteristics.value = items;
  dragSrcIndex.value = null;
}

function tocDragEnd() { dragSrcIndex.value = null; }

// ── Modal ─────────────────────────────────────────────────────────────────────
const showModal    = ref(false);
const modalMode    = ref<'add' | 'edit'>('add');
const editingId    = ref<string | null>(null);
const modalInitial = ref<Partial<CharacteristicForm> | undefined>(undefined);

function tocOpenAddModal() {
  modalMode.value    = 'add';
  editingId.value    = null;
  modalInitial.value = undefined;
  showModal.value    = true;
}

function tocOpenEditModal(char: TocCharacteristic) {
  modalMode.value    = 'edit';
  editingId.value    = char.id;
  modalInitial.value = {
    asterics:         char.asterisk,
    grouping:         false,
    tq5:              false,
    name:             char.title,
    typeOfExpression: char.type,
    growthStage:      '',
    methods: {
      MG:    char.method.includes('MG'),
      MS:    char.method.includes('MS'),
      VG:    char.method.includes('VG'),
      VS:    false,
      OTHER: false,
    },
    mgPlotType: '',
    msPlotType: '',
    states: char.rows.map(r => ({
      id:               Math.random().toString(36).slice(2),
      expression:       r.english,
      notes:            String(r.notes),
      exampleVarieties: r.exampleVarieties ? r.exampleVarieties.split(', ').filter(Boolean) : [],
    })),
    explanation: '',
  };
  showModal.value = true;
}

function tocHandleSave(data: CharacteristicForm) {
  const methodStr = (['MG','MS','VG','VS','OTHER'] as const)
    .filter(k => data.methods[k])
    .join('/');

  if (modalMode.value === 'edit' && editingId.value) {
    const idx = tocCharacteristics.value.findIndex(c => c.id === editingId.value);
    if (idx !== -1) {
      tocCharacteristics.value[idx] = {
        ...tocCharacteristics.value[idx],
        asterisk: data.asterics,
        title:    data.name,
        type:     data.typeOfExpression,
        method:   methodStr,
        rows:     data.states.map(s => ({
          english:          s.expression,
          exampleVarieties: s.exampleVarieties.join(', '),
          notes:            Number(s.notes) || 0,
        })),
      };
    }
  } else {
    tocCharacteristics.value.push({
      id:       `toc-new-${Date.now()}`,
      num:      tocCharacteristics.value.length + 1,
      type:     data.typeOfExpression,
      method:   methodStr,
      asterisk: data.asterics,
      title:    data.name,
      rows:     data.states.map(s => ({
        english:          s.expression,
        exampleVarieties: s.exampleVarieties.join(', '),
        notes:            Number(s.notes) || 0,
      })),
    });
  }
  showModal.value = false;
}

function tocHandleExit() { showModal.value = false; }
</script>

<template>
  <div class="lvd-toc-root">

    <p class="lvd-toc-intro">Search or add new characteristics to describe your variety.</p>

    <!-- ── Search card ─────────────────────────────────────────────────────────── -->
    <div class="lvd-toc-search-card">
      <h2 class="lvd-block-title">Search adopted characteristics</h2>

      <div class="lvd-toc-search-row">
        <div class="lvd-toc-input-wrap" :class="{ 'lvd-toc-input-wrap--filled': tocSearchQuery }">
          <svg class="lvd-toc-input-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="#547F71" stroke-width="1.5"/>
            <path d="M12.5 12.5L16 16" stroke="#547F71" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input
            v-model="tocSearchQuery"
            class="lvd-toc-input"
            type="text"
            placeholder="Search ..."
            @keyup.enter="tocSearch"
          />
          <button v-if="tocSearchQuery" class="lvd-toc-clear-btn" @click="tocClearSearch">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="#1C4240" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Clear
          </button>
        </div>
        <button class="lvd-toc-search-btn" @click="tocSearch">Search</button>
        <button class="lvd-toc-add-btn" @click="tocOpenAddModal">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6.5" stroke="#1C4240" stroke-width="1.3"/>
            <path d="M8 5v6M5 8h6" stroke="#1C4240" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Add new characteristics
        </button>
      </div>

      <div class="lvd-section-links">
        <span class="lvd-links-label">Related links:</span>
        <div class="lvd-section-links-items">
          <a href="#" target="_blank" class="lvd-link">
            Quantity of plant material required (GN7)
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M4.875 2.438H2.438A1.063 1.063 0 0 0 1.375 3.5v7.063A1.063 1.063 0 0 0 2.438 11.624H9.5a1.063 1.063 0 0 0 1.063-1.062V8.125M7.813 1.375H11.625M11.625 1.375V5.188M11.625 1.375L4.875 8.125" stroke="#1C4240" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
      </div>

      <!-- Search results -->
      <template v-if="tocSearchDone">
        <p class="lvd-toc-results-label">
          Found {{ tocSearchResults.length }} results for <strong>"{{ tocSearchQuery }}"</strong>
        </p>
        <div v-if="tocSearchResults.length" class="lvd-toc-results-list">
          <div v-for="result in tocSearchResults" :key="result.id" class="lvd-toc-result-row">
            <div class="lvd-toc-result-main">
              <div class="lvd-toc-result-top">
                <span class="lvd-toc-result-name">{{ result.name }}</span>
                <span class="lvd-toc-result-col">{{ result.genus }}</span>
                <span class="lvd-toc-result-col">Methods: {{ result.methods }}</span>
                <span class="lvd-toc-result-col">Type: {{ result.type }}</span>
                <a href="#" target="_blank" class="lvd-toc-result-tg">
                  {{ result.tgRef }}
                  <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><path d="M4.875 2.438H2.438A1.063 1.063 0 0 0 1.375 3.5v7.063A1.063 1.063 0 0 0 2.438 11.624H9.5a1.063 1.063 0 0 0 1.063-1.062V8.125M7.813 1.375H11.625M11.625 1.375V5.188M11.625 1.375L4.875 8.125" stroke="#1C4240" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </a>
              </div>
              <div class="lvd-toc-result-states">
                <span class="lvd-toc-result-states-label">States of Expression:</span>
                <span class="lvd-toc-result-states-val">{{ result.statesOfExpression }}</span>
              </div>
            </div>
            <button class="lvd-toc-import-btn" @click="tocImport(result)">Import</button>
          </div>
        </div>
      </template>
    </div>

    <!-- ── Preview / characteristics table ────────────────────────────────────── -->
    <div class="lvd-toc-preview-section">
      <div class="lvd-toc-preview-header-row">
        <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
          <path d="M8.5 1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5.5L8.5 1ZM8.5 1v4.5H13" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M5 9.5h5M5 11.5h3" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        <span class="lvd-toc-preview-tag">PREVIEW</span>
      </div>

      <h3 class="lvd-toc-preview-title">List of Characteristics ({{ tocCharacteristics.length }})</h3>

      <template v-if="tocCharacteristics.length === 0">
        <p class="lvd-toc-empty">There are currently no characteristics.</p>
      </template>

      <template v-else>
        <div class="lvd-toc-table-wrap">

          <!-- Table header -->
          <div class="lvd-toc-table-header">
            <div class="lvd-toc-col lvd-toc-col--handle"></div>
            <div class="lvd-toc-col lvd-toc-col--num"></div>
            <div class="lvd-toc-col lvd-toc-col--english">English</div>
            <div class="lvd-toc-col lvd-toc-col--examples">Example Varieties</div>
            <div class="lvd-toc-col lvd-toc-col--notes">Notes</div>
            <div class="lvd-toc-col lvd-toc-col--delete">Delete</div>
          </div>

          <!-- Characteristic groups -->
          <div
            v-for="(char, charIdx) in tocDisplayed"
            :key="char.id"
            class="lvd-toc-group"
            :class="{ 'lvd-toc-group--dragging': dragSrcIndex === charIdx }"
            draggable="true"
            @dragstart="tocDragStart(charIdx)"
            @dragover="tocDragOver"
            @drop="tocDrop(charIdx)"
            @dragend="tocDragEnd"
          >
            <!-- Type / method row -->
            <div class="lvd-toc-group-header">
              <div class="lvd-toc-col lvd-toc-col--handle" style="cursor: grab;">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <g clip-path="url(#toc-drag-clip)">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M1.25 10.0001C1.25 9.83438 1.31585 9.67541 1.43306 9.5582C1.55027 9.44099 1.70924 9.37514 1.875 9.37514H18.125C18.2908 9.37514 18.4497 9.44099 18.5669 9.5582C18.6842 9.67541 18.75 9.83438 18.75 10.0001C18.75 10.1659 18.6842 10.3249 18.5669 10.4421C18.4497 10.5593 18.2908 10.6251 18.125 10.6251H1.875C1.70924 10.6251 1.55027 10.5593 1.43306 10.4421C1.31585 10.3249 1.25 10.1659 1.25 10.0001ZM9.5575 0.182641C9.61556 0.124437 9.68453 0.0782581 9.76046 0.04675C9.83639 0.0152419 9.91779 -0.000976563 10 -0.000976562C10.0822 -0.000976563 10.1636 0.0152419 10.2395 0.04675C10.3155 0.0782581 10.3844 0.124437 10.4425 0.182641L12.9425 2.68264C13.0006 2.74075 13.0467 2.80974 13.0782 2.88566C13.1096 2.96159 13.1258 3.04296 13.1258 3.12514C13.1258 3.20732 13.1096 3.2887 13.0782 3.36462C13.0467 3.44054 13.0006 3.50953 12.9425 3.56764C12.8844 3.62575 12.8154 3.67185 12.7395 3.70329C12.6636 3.73474 12.5822 3.75093 12.5 3.75093C12.4178 3.75093 12.3364 3.73474 12.2605 3.70329C12.1846 3.67185 12.1156 3.62575 12.0575 3.56764L10.625 2.13389V6.87514C10.625 7.0409 10.5592 7.19987 10.4419 7.31708C10.3247 7.43429 10.1658 7.50014 10 7.50014C9.83424 7.50014 9.67527 7.43429 9.55806 7.31708C9.44085 7.19987 9.375 7.0409 9.375 6.87514V2.13389L7.9425 3.56764C7.82514 3.685 7.66597 3.75093 7.5 3.75093C7.33403 3.75093 7.17486 3.685 7.0575 3.56764C6.94014 3.45028 6.87421 3.29111 6.87421 3.12514C6.87421 2.95917 6.94014 2.8 7.0575 2.68264L9.5575 0.182641ZM10 12.5001C10.1658 12.5001 10.3247 12.566 10.4419 12.6832C10.5592 12.8004 10.625 12.9594 10.625 13.1251V17.8664L12.0575 16.4326C12.1749 16.3153 12.334 16.2494 12.5 16.2494C12.666 16.2494 12.8251 16.3153 12.9425 16.4326C13.0599 16.55 13.1258 16.7092 13.1258 16.8751C13.1258 17.0411 13.0599 17.2003 12.9425 17.3176L10.4425 19.8176C10.3844 19.8758 10.3155 19.922 10.2395 19.9535C10.1636 19.985 10.0822 20.0013 10 20.0013C9.91779 20.0013 9.83639 19.985 9.76046 19.9535C9.68453 19.922 9.61556 19.8758 9.5575 19.8176L7.0575 17.3176C6.99939 17.2595 6.95329 17.1905 6.92185 17.1146C6.8904 17.0387 6.87421 16.9573 6.87421 16.8751C6.87421 16.793 6.8904 16.7116 6.92185 16.6357C6.95329 16.5597 6.99939 16.4907 7.0575 16.4326C7.17486 16.3153 7.33403 16.2494 7.5 16.2494C7.58218 16.2494 7.66356 16.2655 7.73948 16.297C7.8154 16.3284 7.88439 16.3745 7.9425 16.4326L9.375 17.8664V13.1251C9.375 12.9594 9.44085 12.8004 9.55806 12.6832C9.67527 12.566 9.83424 12.5001 10 12.5001Z"
                      fill="#1C4240"/>
                  </g>
                  <defs>
                    <clipPath id="toc-drag-clip"><rect width="20" height="20" fill="white"/></clipPath>
                  </defs>
                </svg>
              </div>
              <div class="lvd-toc-col lvd-toc-col--num">
                <span class="lvd-toc-group-num">{{ char.num }}</span>
                <span v-if="char.asterisk" class="lvd-toc-asterisk">(*)</span>
              </div>
              <div class="lvd-toc-col lvd-toc-col--english lvd-toc-type-method">
                {{ char.type }} &nbsp; {{ char.method }}
              </div>
              <div class="lvd-toc-col lvd-toc-col--examples"></div>
              <div class="lvd-toc-col lvd-toc-col--notes"></div>
              <div class="lvd-toc-col lvd-toc-col--delete">
                <button class="lvd-toc-delete-btn" title="Delete" @click="tocDeleteCharacteristic(char.id)">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M5 4V2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 .5.5V4M6 7v5M10 7v5M3 4l1 9.5A.5.5 0 0 0 4.5 14h7a.5.5 0 0 0 .5-.5L13 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Characteristic title row -->
            <div class="lvd-toc-group-title-row">
              <div class="lvd-toc-col lvd-toc-col--handle"></div>
              <div class="lvd-toc-col lvd-toc-col--num"></div>
              <div
                class="lvd-toc-col lvd-toc-col--english lvd-toc-char-title lvd-toc-char-title--clickable"
                @click="tocOpenEditModal(char)"
              >
                {{ char.title }}
              </div>
              <div class="lvd-toc-col lvd-toc-col--examples"></div>
              <div class="lvd-toc-col lvd-toc-col--notes"></div>
              <div class="lvd-toc-col lvd-toc-col--delete"></div>
            </div>

            <!-- Data rows -->
            <div v-for="(row, rIdx) in char.rows" :key="rIdx" class="lvd-toc-row">
              <div class="lvd-toc-col lvd-toc-col--handle"></div>
              <div class="lvd-toc-col lvd-toc-col--num"></div>
              <div class="lvd-toc-col lvd-toc-col--english">{{ row.english }}</div>
              <div class="lvd-toc-col lvd-toc-col--examples">{{ row.exampleVarieties }}</div>
              <div class="lvd-toc-col lvd-toc-col--notes">{{ row.notes }}</div>
              <div class="lvd-toc-col lvd-toc-col--delete"></div>
            </div>

          </div><!-- /group -->
        </div><!-- /table-wrap -->

        <!-- Load more -->
        <div v-if="displayedCount < tocCharacteristics.length" class="lvd-toc-load-more">
          <button class="lvd-toc-load-more-btn" @click="loadMore">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M15 9A6 6 0 1 1 9 3c1.657 0 3.156.672 4.243 1.757L15 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M15 3v3.5h-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Load more
          </button>
        </div>
      </template>
    </div>

    <!-- Characteristics modal -->
    <CharacteristicsModal
      v-if="showModal"
      :mode="modalMode"
      :initial-data="modalInitial"
      @exit="tocHandleExit"
      @save="tocHandleSave"
    />

  </div>
</template>

<style scoped>
.lvd-toc-root { display: flex; flex-direction: column; gap: 20px; }

.lvd-toc-intro { font-size: 14px; font-weight: 400; color: #303030; line-height: 20px; }

/* ── Search card ─────────────────────────────────────────────────────────────── */
.lvd-toc-search-card { background: #FFFFFF; border-radius: 8px; box-shadow: 0px 2px 8px rgba(70,70,70,0.04); padding: 16px 20px; display: flex; flex-direction: column; gap: 16px; }
.lvd-block-title { font-size: 18px; font-weight: 700; color: #303030; line-height: 22px; }
.lvd-toc-search-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.lvd-toc-input-wrap { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 12px; border: 1px solid #1C4240; border-radius: 4px; background: #FFFFFF; flex: 1; min-width: 180px; max-width: 420px; transition: border-width 0.12s, padding 0.12s; }
.lvd-toc-input-wrap:focus-within { border-width: 2px; padding: 0 11px; }
.lvd-toc-input { flex: 1; border: none; outline: none; font-family: 'Figtree', sans-serif; font-size: 14px; color: #303030; background: transparent; min-width: 0; }
.lvd-toc-input::placeholder { color: #727272; }
.lvd-toc-clear-btn { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; cursor: pointer; font-family: 'Figtree', sans-serif; font-size: 13px; font-weight: 600; color: #1C4240; padding: 0; white-space: nowrap; text-decoration: underline; text-decoration-color: #DADE14; text-underline-offset: 2px; transition: opacity 0.15s; }
.lvd-toc-clear-btn:hover { opacity: 0.7; }
.lvd-toc-search-btn { height: 40px; padding: 0 28px; background: #1C4240; color: #DADE14; font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 600; border: none; border-radius: 100px; cursor: pointer; flex-shrink: 0; transition: opacity 0.15s, transform 0.1s; }
.lvd-toc-search-btn:hover  { opacity: 0.88; }
.lvd-toc-search-btn:active { transform: scale(0.97); }
.lvd-toc-add-btn { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 20px; background: #FFFFFF; color: #1C4240; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 600; border: 1.5px solid #939600; border-radius: 100px; cursor: pointer; flex-shrink: 0; margin-left: auto; transition: background 0.15s; }
.lvd-toc-add-btn:hover { background: rgba(147,150,0,0.06); }

/* ── Links ───────────────────────────────────────────────────────────────────── */
.lvd-section-links { display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
.lvd-section-links-items { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.lvd-links-label { font-size: 13px; font-weight: 400; color: #303030; white-space: nowrap; }
.lvd-link { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: #1C4240; text-decoration: underline; text-decoration-color: #DADE14; text-decoration-thickness: 2px; text-underline-offset: 2px; cursor: pointer; transition: opacity 0.15s; }
.lvd-link:hover { opacity: 0.7; }

/* ── Search results ──────────────────────────────────────────────────────────── */
.lvd-toc-results-label { font-size: 18px; font-weight: 400; color: #1C4240; line-height: 22px; }
.lvd-toc-results-list { display: flex; flex-direction: column; border-top: 1px solid #B8B4A4; }
.lvd-toc-result-row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 24px; padding: 20px 0; border-bottom: 1px solid #B8B4A4; }
.lvd-toc-result-main { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.lvd-toc-result-top { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; align-items: center; gap: 8px; width: 100%; }
.lvd-toc-result-name { font-size: 16px; font-weight: 700; color: #1C4240; }
.lvd-toc-result-col { font-size: 14px; font-weight: 600; color: #303030; }
.lvd-toc-result-tg { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: #1C4240; text-decoration: underline; text-decoration-color: #DADE14; text-decoration-thickness: 2px; text-underline-offset: 2px; cursor: pointer; }
.lvd-toc-result-tg:hover { opacity: 0.7; }
.lvd-toc-result-states { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; }
.lvd-toc-result-states-label { font-size: 13px; font-weight: 400; color: #303030; white-space: nowrap; }
.lvd-toc-result-states-val { font-size: 13px; font-weight: 700; color: #303030; }
.lvd-toc-import-btn { height: 36px; padding: 0 24px; background: #FFFFFF; color: #1C4240; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 600; border: 1.5px solid #939600; border-radius: 100px; cursor: pointer; flex-shrink: 0; white-space: nowrap; transition: background 0.15s; }
.lvd-toc-import-btn:hover { background: rgba(147,150,0,0.06); }

/* ── Preview section ─────────────────────────────────────────────────────────── */
.lvd-toc-preview-section { display: flex; flex-direction: column; gap: 14px; background: rgba(184,180,164,0.16); border-radius: 6px; padding: 16px; }
.lvd-toc-preview-header-row { display: flex; align-items: center; gap: 5px; }
.lvd-toc-preview-tag { font-size: 12px; font-weight: 600; color: #AD4E02; letter-spacing: 0.5px; }
.lvd-toc-preview-title { font-size: 15px; font-weight: 700; color: #303030; line-height: 19px; }
.lvd-toc-empty { font-size: 14px; color: #303030; }

/* ── Table ───────────────────────────────────────────────────────────────────── */
.lvd-toc-table-wrap { border-radius: 4px; overflow: hidden; }
.lvd-toc-table-header { display: flex; align-items: center; background: #FFFFFF; border-bottom: 1.5px solid #B8B4A4; padding: 8px 0; font-size: 13px; font-weight: 700; color: #303030; }
.lvd-toc-col            { padding: 4px 8px; min-width: 0; }
.lvd-toc-col--handle    { flex: 0 0 36px; display: flex; align-items: center; justify-content: center; cursor: grab; }
.lvd-toc-col--num       { flex: 0 0 58px; display: flex; align-items: center; gap: 3px; }
.lvd-toc-col--english   { flex: 3; min-width: 0; }
.lvd-toc-col--examples  { flex: 3; min-width: 0; }
.lvd-toc-col--notes     { flex: 0 0 80px; text-align: center; }
.lvd-toc-col--delete    { flex: 0 0 70px; display: flex; align-items: center; justify-content: center; }
.lvd-toc-group { border-bottom: 1px solid #B8B4A4; transition: opacity 0.15s; }
.lvd-toc-group:last-child { border-bottom: none; }
.lvd-toc-group--dragging { opacity: 0.4; }
.lvd-toc-group-header { display: flex; align-items: center; min-height: 36px; background: #F9F9F9; border-bottom: 1px solid #E2E2E2; }
.lvd-toc-type-method { font-size: 14px; font-weight: 700; color: #303030; }
.lvd-toc-group-num { font-size: 13px; font-weight: 700; color: #303030; }
.lvd-toc-asterisk  { font-size: 12px; font-weight: 500; color: #303030; }
.lvd-toc-delete-btn { display: inline-flex; align-items: center; justify-content: center; background: none; border: none; cursor: pointer; padding: 5px; border-radius: 4px; color: #9E9E9E; transition: color 0.15s, background 0.12s; }
.lvd-toc-delete-btn:hover { color: #C62828; background: rgba(198,40,40,0.07); }
.lvd-toc-group-title-row { display: flex; align-items: center; min-height: 32px; background: #FFFFFF; border-bottom: 1px solid #F0EDE6; }
.lvd-toc-char-title { font-size: 14px; font-weight: 700; color: #303030; text-decoration-line: underline; text-decoration-color: #DADE14; text-decoration-thickness: 2px; text-decoration-skip-ink: auto; }
.lvd-toc-char-title--clickable { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: opacity 0.15s; }
.lvd-toc-char-title--clickable:hover { opacity: 0.8; }
.lvd-toc-row { display: flex; align-items: center; min-height: 28px; background: #FFFFFF; font-size: 13px; font-weight: 400; color: #303030; border-bottom: 1px solid #F5F3EE; transition: background 0.1s; }
.lvd-toc-row:last-child { border-bottom: none; }
.lvd-toc-row:hover { background: #FAFAF8; }

/* ── Load more ───────────────────────────────────────────────────────────────── */
.lvd-toc-load-more { display: flex; justify-content: center; padding: 16px 0 8px; }
.lvd-toc-load-more-btn { display: inline-flex; align-items: center; gap: 8px; height: 36px; padding: 0 28px; background: #FFFFFF; border: 1.5px solid #DADE14; border-radius: 100px; cursor: pointer; font-family: 'Figtree', sans-serif; font-size: 14px; font-weight: 600; color: #303030; transition: background 0.15s, transform 0.1s; }
.lvd-toc-load-more-btn:hover  { background: #F5F3EE; }
.lvd-toc-load-more-btn:active { transform: scale(0.97); }
</style>