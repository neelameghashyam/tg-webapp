<script setup lang="ts">
import { ref } from 'vue';
import type { RelatedLink } from './types';

// ── Accordion sections ────────────────────────────────────────────────────────
const sections = ref([
  { id: 'ex-3-1', number: '3.1', title: 'Number of Growing Cycles',                 isOpen: false },
  { id: 'ex-3-2', number: '3.2', title: 'Testing Place',                             isOpen: false },
  { id: 'ex-3-3', number: '3.3', title: 'Conditions for Conducting the Examination', isOpen: false },
  { id: 'ex-3-4', number: '3.4', title: 'Test Design',                               isOpen: false },
  { id: 'ex-3-5', number: '3.5', title: 'Additional Tests',                          isOpen: false },
]);

function toggleSection(id: string) {
  const s = sections.value.find(x => x.id === id);
  if (s) s.isOpen = !s.isOpen;
}

// ── 3.1 – Number of Growing Cycles ──────────────────────────────────────────
const growingCycleRadio    = ref<'single' | 'two'>('two');
const growingCycleSubRadio = ref<'two-separate' | 'single-planting' | null>('single-planting');
const satisfactoryFruitRadio = ref<'yes' | 'no' | null>('yes');
const fruitTypeRadio         = ref<'dormant' | 'no-dormant' | 'evergreen' | null>('evergreen');
const inlineTreesInput       = ref('trees');

// ── 3.3 – Conditions for Conducting the Examination ─────────────────────────
const condStagesRadio = ref<'yes' | 'no' | null>('no');
const condPlotsRadio  = ref<'yes' | 'no' | null>('no');
const condColorRadio  = ref<'yes' | 'no' | null>('no');

// ── 3.4 – Test Design ────────────────────────────────────────────────────────
const tdMorePropRadio   = ref<'yes' | 'no' | null>('no');
const tdPlotDesignRadio = ref<'single' | 'one-type' | 'diff-types' | null>('single');
const tdRemovalRadio    = ref<'yes' | 'no' | null>('yes');
const tdPlantCountInput = ref('');
const tdPlantTypeInput  = ref('');

// ── Related links per sub-section ────────────────────────────────────────────
const links31: RelatedLink[] = [{ text: 'Explanation of the growing cycle (GN 8)', url: '#' }];
const links33: RelatedLink[] = [{ text: 'Guidance on stages (GN 12)',              url: '#' }];
const links34: RelatedLink[] = [{ text: 'Test design guidance (TGP/9)',            url: '#' }];
</script>

<template>
  <div class="lvd-mat-accordion">

    <!-- ── 3.1 Number of Growing Cycles ──────────────────────────────────────── -->
    <div class="lvd-mat-card">
      <button class="lvd-mat-header" @click="toggleSection('ex-3-1')">
        <span class="lvd-mat-chevron">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path v-if="sections[0].isOpen" d="M4.5 11.25L9 6.75L13.5 11.25" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path v-else d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <h4 class="lvd-mat-title">{{ sections[0].number }} {{ sections[0].title }}</h4>
      </button>
      <Transition name="lvd-mat-body">
        <div v-if="sections[0].isOpen" class="lvd-mat-body lvd-ex-body">

          <div class="lvd-section-links">
            <span class="lvd-links-label">Related links:</span>
            <div class="lvd-section-links-items">
              <a v-for="(lnk, i) in links31" :key="i" :href="lnk.url || '#'" target="_blank" class="lvd-link">
                {{ lnk.text }}
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M4.875 2.438H2.438A1.063 1.063 0 0 0 1.375 3.5v7.063A1.063 1.063 0 0 0 2.438 11.624H9.5a1.063 1.063 0 0 0 1.063-1.062V8.125M7.813 1.375H11.625M11.625 1.375V5.188M11.625 1.375L4.875 8.125" stroke="#1C4240" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </a>
            </div>
          </div>

          <!-- 3.1.1 -->
          <div class="lvd-question">
            <h3 class="lvd-q-label">3.1.1 Title text</h3>
            <div class="lvd-ex-radios">
              <label class="lvd-ex-radio-row" @click.prevent="growingCycleRadio = 'single'; growingCycleSubRadio = null">
                <span class="lvd-ex-radio-circle" :class="{ 'lvd-ex-radio-circle--on': growingCycleRadio === 'single' }"></span>
                <span class="lvd-ex-radio-text">Single growing cycle</span>
              </label>
              <label class="lvd-ex-radio-row" @click.prevent="growingCycleRadio = 'two'">
                <span class="lvd-ex-radio-circle lvd-ex-radio-circle--green" :class="{ 'lvd-ex-radio-circle--on': growingCycleRadio === 'two' }"></span>
                <span class="lvd-ex-radio-text">Two independent growing cycles</span>
              </label>
              <template v-if="growingCycleRadio === 'two'">
                <label class="lvd-ex-radio-row lvd-ex-radio-row--indented" @click.prevent="growingCycleSubRadio = 'two-separate'">
                  <span class="lvd-ex-radio-circle" :class="{ 'lvd-ex-radio-circle--on': growingCycleSubRadio === 'two-separate' }"></span>
                  <span class="lvd-ex-radio-text">Two independent cycles in the form of two separate plantings</span>
                </label>
                <label class="lvd-ex-radio-row lvd-ex-radio-row--indented" @click.prevent="growingCycleSubRadio = 'single-planting'">
                  <span class="lvd-ex-radio-circle lvd-ex-radio-circle--green" :class="{ 'lvd-ex-radio-circle--on': growingCycleSubRadio === 'single-planting' }"></span>
                  <span class="lvd-ex-radio-text">Two independent cycles from a single planting</span>
                </label>
              </template>
            </div>
          </div>

          <h3 class="lvd-q-label">3.1.2 Standard items are configured by default</h3>

          <!-- 3.1.3 -->
          <div class="lvd-question">
            <h3 class="lvd-q-label">3.1.3 Title text</h3>
            <p class="lvd-q-text">Is a satisfactory crop of fruit required?</p>
            <div class="lvd-radio-group">
              <label class="lvd-radio-opt" @click.prevent="satisfactoryFruitRadio = 'yes'">
                <span class="lvd-radio-circle lvd-radio-circle--green" :class="{ 'lvd-radio-circle--on': satisfactoryFruitRadio === 'yes' }"></span>
                <span class="lvd-radio-text">Yes</span>
              </label>
              <label class="lvd-radio-opt" @click.prevent="satisfactoryFruitRadio = 'no'">
                <span class="lvd-radio-circle" :class="{ 'lvd-radio-circle--on': satisfactoryFruitRadio === 'no' }"></span>
                <span class="lvd-radio-text">No</span>
              </label>
            </div>
            <div v-if="satisfactoryFruitRadio === 'yes'" class="lvd-ex-radios lvd-ex-radios--indented">
              <label class="lvd-ex-radio-row" @click.prevent="fruitTypeRadio = 'dormant'">
                <span class="lvd-ex-radio-circle" :class="{ 'lvd-ex-radio-circle--on': fruitTypeRadio === 'dormant' }"></span>
                <span class="lvd-ex-radio-text">Fruit species with clearly defined dormant period. <strong>(ASW3(a))</strong></span>
              </label>
              <label class="lvd-ex-radio-row" @click.prevent="fruitTypeRadio = 'no-dormant'">
                <span class="lvd-ex-radio-circle" :class="{ 'lvd-ex-radio-circle--on': fruitTypeRadio === 'no-dormant' }"></span>
                <span class="lvd-ex-radio-text">Fruit species with no clearly defined dormant period. <strong>(ASW3(b))</strong></span>
              </label>
              <label class="lvd-ex-radio-row" @click.prevent="fruitTypeRadio = 'evergreen'">
                <span class="lvd-ex-radio-circle lvd-ex-radio-circle--green" :class="{ 'lvd-ex-radio-circle--on': fruitTypeRadio === 'evergreen' }"></span>
                <span class="lvd-ex-radio-text">Evergreen species with indeterminate growth. <strong>(ASW3(c))</strong></span>
              </label>
            </div>
          </div>

          <h3 class="lvd-q-label">3.1.4 Standard items are configured by default</h3>

          <!-- Preview -->
          <div class="lvd-preview-box">
            <div class="lvd-preview-header">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M8.5 1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5.5L8.5 1ZM8.5 1v4.5H13" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 9.5h5M5 11.5h3" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round"/></svg>
              <span class="lvd-preview-label">PREVIEW</span>
            </div>
            <p class="lvd-preview-text">3.1.1 The minimum duration of tests should normally be two independent growing cycles.</p>
            <p class="lvd-preview-text">3.1.2 The two independent growing cycles may be observed from a single planting, examined in two separate growing cycles.</p>
            <div class="lvd-ex-inline-row">
              <span class="lvd-preview-text">3.1.3 In particular, it is essential that the</span>
              <div class="lvd-ex-input-wrap">
                <input v-model="inlineTreesInput" class="lvd-ex-input" type="text" placeholder="trees" />
              </div>
              <span class="lvd-preview-text">produce a satisfactory crop of fruit in each of the two growing cycles.</span>
            </div>
            <p class="lvd-preview-text">3.1.4 The testing of a ....</p>
          </div>

        </div>
      </Transition>
    </div>

    <!-- ── 3.2 Testing Place ──────────────────────────────────────────────────── -->
    <div class="lvd-mat-card">
      <button class="lvd-mat-header" @click="toggleSection('ex-3-2')">
        <span class="lvd-mat-chevron">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path v-if="sections[1].isOpen" d="M4.5 11.25L9 6.75L13.5 11.25" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path v-else d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <h4 class="lvd-mat-title">{{ sections[1].number }} {{ sections[1].title }}</h4>
      </button>
      <Transition name="lvd-mat-body">
        <div v-if="sections[1].isOpen" class="lvd-mat-body lvd-ex-body">
          <h3 class="lvd-q-label">3.2.1 Standard items are configured by default</h3>
          <div class="lvd-preview-box">
            <div class="lvd-preview-header">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M8.5 1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5.5L8.5 1ZM8.5 1v4.5H13" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 9.5h5M5 11.5h3" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round"/></svg>
              <span class="lvd-preview-label">PREVIEW</span>
            </div>
            <p class="lvd-preview-text">3.2.1 Tests are normally conducted at one place. In the case of tests conducted at more than one place, guidance is provided in TGP/9 "Examining Distinctness".</p>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ── 3.3 Conditions for Conducting the Examination ─────────────────────── -->
    <div class="lvd-mat-card">
      <button class="lvd-mat-header" @click="toggleSection('ex-3-3')">
        <span class="lvd-mat-chevron">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path v-if="sections[2].isOpen" d="M4.5 11.25L9 6.75L13.5 11.25" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path v-else d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <h4 class="lvd-mat-title">{{ sections[2].number }} {{ sections[2].title }}</h4>
      </button>
      <Transition name="lvd-mat-body">
        <div v-if="sections[2].isOpen" class="lvd-mat-body lvd-ex-body">

          <div class="lvd-section-links">
            <span class="lvd-links-label">Related links:</span>
            <div class="lvd-section-links-items">
              <a v-for="(lnk, i) in links33" :key="i" :href="lnk.url || '#'" target="_blank" class="lvd-link">
                {{ lnk.text }}
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M4.875 2.438H2.438A1.063 1.063 0 0 0 1.375 3.5v7.063A1.063 1.063 0 0 0 2.438 11.624H9.5a1.063 1.063 0 0 0 1.063-1.062V8.125M7.813 1.375H11.625M11.625 1.375V5.188M11.625 1.375L4.875 8.125" stroke="#1C4240" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </a>
            </div>
          </div>

          <!-- 3.3.1 -->
          <div class="lvd-question">
            <h3 class="lvd-q-label">3.3.1 Title text</h3>
            <p class="lvd-q-text">Indicate if there are stages of development in the Table of Characteristics</p>
            <div class="lvd-radio-group">
              <label class="lvd-radio-opt" @click.prevent="condStagesRadio = 'yes'">
                <span class="lvd-radio-circle" :class="{ 'lvd-radio-circle--on': condStagesRadio === 'yes' }"></span>
                <span class="lvd-radio-text">Yes</span>
              </label>
              <label class="lvd-radio-opt" @click.prevent="condStagesRadio = 'no'">
                <span class="lvd-radio-circle lvd-radio-circle--green" :class="{ 'lvd-radio-circle--on': condStagesRadio === 'no' }"></span>
                <span class="lvd-radio-text">No</span>
              </label>
            </div>
          </div>

          <!-- 3.3.2 -->
          <div class="lvd-question">
            <h3 class="lvd-q-label">3.3.2 Title text</h3>
            <p class="lvd-q-text">Are there different types of plots for observation?</p>
            <div class="lvd-radio-group">
              <label class="lvd-radio-opt" @click.prevent="condPlotsRadio = 'yes'">
                <span class="lvd-radio-circle" :class="{ 'lvd-radio-circle--on': condPlotsRadio === 'yes' }"></span>
                <span class="lvd-radio-text">Yes</span>
              </label>
              <label class="lvd-radio-opt" @click.prevent="condPlotsRadio = 'no'">
                <span class="lvd-radio-circle lvd-radio-circle--green" :class="{ 'lvd-radio-circle--on': condPlotsRadio === 'no' }"></span>
                <span class="lvd-radio-text">No</span>
              </label>
            </div>
          </div>

          <!-- 3.3.3 -->
          <div class="lvd-question">
            <h3 class="lvd-q-label">3.3.3 Title text</h3>
            <p class="lvd-q-text">Indicate if the observation of color by eye applies:</p>
            <div class="lvd-radio-group">
              <label class="lvd-radio-opt" @click.prevent="condColorRadio = 'yes'">
                <span class="lvd-radio-circle" :class="{ 'lvd-radio-circle--on': condColorRadio === 'yes' }"></span>
                <span class="lvd-radio-text">Yes</span>
              </label>
              <label class="lvd-radio-opt" @click.prevent="condColorRadio = 'no'">
                <span class="lvd-radio-circle lvd-radio-circle--green" :class="{ 'lvd-radio-circle--on': condColorRadio === 'no' }"></span>
                <span class="lvd-radio-text">No</span>
              </label>
            </div>
          </div>

          <!-- Preview -->
          <div class="lvd-preview-box">
            <div class="lvd-preview-header">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M8.5 1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5.5L8.5 1ZM8.5 1v4.5H13" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 9.5h5M5 11.5h3" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round"/></svg>
              <span class="lvd-preview-label">PREVIEW</span>
            </div>
            <div class="lvd-mat-info-row">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6.5" stroke="#303030" stroke-width="1.1"/><path d="M7.5 6.5V10.5" stroke="#303030" stroke-width="1.3" stroke-linecap="round"/><circle cx="7.5" cy="4.5" r="0.8" fill="#303030"/></svg>
              <span class="lvd-mat-info-text">There is currently no information to fill in.</span>
            </div>
          </div>

        </div>
      </Transition>
    </div>

    <!-- ── 3.4 Test Design ────────────────────────────────────────────────────── -->
    <div class="lvd-mat-card">
      <button class="lvd-mat-header" @click="toggleSection('ex-3-4')">
        <span class="lvd-mat-chevron">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path v-if="sections[3].isOpen" d="M4.5 11.25L9 6.75L13.5 11.25" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path v-else d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <h4 class="lvd-mat-title">{{ sections[3].number }} {{ sections[3].title }}</h4>
      </button>
      <Transition name="lvd-mat-body">
        <div v-if="sections[3].isOpen" class="lvd-mat-body lvd-ex-body">

          <div class="lvd-section-links">
            <span class="lvd-links-label">Related links:</span>
            <div class="lvd-section-links-items">
              <a v-for="(lnk, i) in links34" :key="i" :href="lnk.url || '#'" target="_blank" class="lvd-link">
                {{ lnk.text }}
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M4.875 2.438H2.438A1.063 1.063 0 0 0 1.375 3.5v7.063A1.063 1.063 0 0 0 2.438 11.624H9.5a1.063 1.063 0 0 0 1.063-1.062V8.125M7.813 1.375H11.625M11.625 1.375V5.188M11.625 1.375L4.875 8.125" stroke="#1C4240" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </a>
            </div>
          </div>

          <!-- 3.4.1 -->
          <div class="lvd-question">
            <h3 class="lvd-q-label">3.4.1 Title text</h3>
            <p class="lvd-q-text">Is there more than one method of propagation: <span class="lvd-required">*</span></p>
            <div class="lvd-radio-group">
              <label class="lvd-radio-opt" @click.prevent="tdMorePropRadio = 'yes'">
                <span class="lvd-radio-circle" :class="{ 'lvd-radio-circle--on': tdMorePropRadio === 'yes' }"></span>
                <span class="lvd-radio-text">Yes</span>
              </label>
              <label class="lvd-radio-opt" @click.prevent="tdMorePropRadio = 'no'">
                <span class="lvd-radio-circle lvd-radio-circle--green" :class="{ 'lvd-radio-circle--on': tdMorePropRadio === 'no' }"></span>
                <span class="lvd-radio-text">No</span>
              </label>
            </div>
          </div>

          <!-- 3.4.2 -->
          <div class="lvd-question">
            <h3 class="lvd-q-label">3.4.2 Plot design</h3>
            <div class="lvd-ex-radios">
              <label class="lvd-ex-radio-row" @click.prevent="tdPlotDesignRadio = 'single'">
                <span class="lvd-ex-radio-circle lvd-ex-radio-circle--green" :class="{ 'lvd-ex-radio-circle--on': tdPlotDesignRadio === 'single' }"></span>
                <span class="lvd-ex-radio-text">Single plot</span>
              </label>
              <label class="lvd-ex-radio-row" @click.prevent="tdPlotDesignRadio = 'one-type'">
                <span class="lvd-ex-radio-circle" :class="{ 'lvd-ex-radio-circle--on': tdPlotDesignRadio === 'one-type' }"></span>
                <span class="lvd-ex-radio-text">One type of plot, but replicated</span>
              </label>
              <label class="lvd-ex-radio-row" @click.prevent="tdPlotDesignRadio = 'diff-types'">
                <span class="lvd-ex-radio-circle" :class="{ 'lvd-ex-radio-circle--on': tdPlotDesignRadio === 'diff-types' }"></span>
                <span class="lvd-ex-radio-text">If different types of plots</span>
              </label>
            </div>
          </div>

          <!-- 3.4.3 -->
          <div class="lvd-question">
            <h3 class="lvd-q-label">3.4.3 Title text</h3>
            <p class="lvd-q-text">Is it necessary to state that the design of the tests should be such that plants or parts of plants may be removed for measurement or counting without prejudice to the observations which must be made up to the end of growing cycle?</p>
            <div class="lvd-radio-group">
              <label class="lvd-radio-opt" @click.prevent="tdRemovalRadio = 'yes'">
                <span class="lvd-radio-circle lvd-radio-circle--green" :class="{ 'lvd-radio-circle--on': tdRemovalRadio === 'yes' }"></span>
                <span class="lvd-radio-text">Yes</span>
              </label>
              <label class="lvd-radio-opt" @click.prevent="tdRemovalRadio = 'no'">
                <span class="lvd-radio-circle" :class="{ 'lvd-radio-circle--on': tdRemovalRadio === 'no' }"></span>
                <span class="lvd-radio-text">No</span>
              </label>
            </div>
          </div>

          <!-- Preview -->
          <div class="lvd-preview-box">
            <div class="lvd-preview-header">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M8.5 1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5.5L8.5 1ZM8.5 1v4.5H13" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 9.5h5M5 11.5h3" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round"/></svg>
              <span class="lvd-preview-label">PREVIEW</span>
            </div>
            <div class="lvd-ex-inline-row">
              <span class="lvd-preview-text">3.4.2 Each test should be designed to result in a total of at least</span>
              <div class="lvd-ex-input-wrap lvd-ex-input-wrap--sm">
                <input v-model="tdPlantCountInput" class="lvd-ex-input" type="text" placeholder="3" />
              </div>
              <span class="lvd-preview-text">(number)</span>
              <div class="lvd-ex-input-wrap">
                <input v-model="tdPlantTypeInput" class="lvd-ex-input" type="text" placeholder="plants" />
              </div>
            </div>
            <p class="lvd-preview-text">3.4.3 The design of the tests should be such that plants or parts of plants may be removed for measurement or counting without prejudice to the observations which must be made up to the end of the growing cycle.</p>
          </div>

        </div>
      </Transition>
    </div>

    <!-- ── 3.5 Additional Tests ───────────────────────────────────────────────── -->
    <div class="lvd-mat-card">
      <button class="lvd-mat-header" @click="toggleSection('ex-3-5')">
        <span class="lvd-mat-chevron">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path v-if="sections[4].isOpen" d="M4.5 11.25L9 6.75L13.5 11.25" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path v-else d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <h4 class="lvd-mat-title">{{ sections[4].number }} {{ sections[4].title }}</h4>
      </button>
      <Transition name="lvd-mat-body">
        <div v-if="sections[4].isOpen" class="lvd-mat-body">
          <p class="lvd-mat-empty">No content available.</p>
        </div>
      </Transition>
    </div>

  </div>
</template>

<style scoped>
/* ── Accordion shell ─────────────────────────────────────────────────────────── */
.lvd-mat-accordion { display: flex; flex-direction: column; gap: 12px; }
.lvd-mat-card { background: #FFFFFF; border-radius: 8px; box-shadow: 0px 2px 8px rgba(70,70,70,0.04); overflow: hidden; }
.lvd-mat-header { width: 100%; display: flex; align-items: center; gap: 12px; padding: 16px; background: none; border: none; cursor: pointer; text-align: left; font-family: 'Figtree', sans-serif; transition: background 0.12s; }
.lvd-mat-header:hover { background: rgba(0,0,0,0.02); }
.lvd-mat-chevron { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; flex-shrink: 0; }
.lvd-mat-title { font-family: 'Figtree', sans-serif; font-size: 18px; font-weight: 700; line-height: 22px; color: #303030; margin: 0; }
.lvd-mat-body { padding: 0 16px 20px; }
.lvd-mat-empty { font-size: 14px; color: #727272; }

/* ── Examination body ────────────────────────────────────────────────────────── */
.lvd-ex-body { display: flex; flex-direction: column; gap: 20px; padding: 0 16px 20px; }

/* ── Links ───────────────────────────────────────────────────────────────────── */
.lvd-section-links { display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
.lvd-section-links-items { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.lvd-links-label { font-size: 13px; font-weight: 400; color: #303030; white-space: nowrap; }
.lvd-link { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 600; color: #1C4240; text-decoration: underline; text-decoration-color: #DADE14; text-decoration-thickness: 2px; text-underline-offset: 2px; cursor: pointer; transition: opacity 0.15s; }
.lvd-link:hover { opacity: 0.7; }

/* ── Questions ───────────────────────────────────────────────────────────────── */
.lvd-question { display: flex; flex-direction: column; gap: 10px; }
.lvd-q-label  { font-size: 16px; font-weight: 700; color: #303030; line-height: 20px; }
.lvd-q-text   { font-size: 14px; font-weight: 400; color: #303030; line-height: 20px; }
.lvd-required { color: #D32F2F; margin-left: 2px; }

/* ── Radio – inline yes/no ───────────────────────────────────────────────────── */
.lvd-radio-group { display: flex; align-items: center; gap: 24px; }
.lvd-radio-opt { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.lvd-radio-text { font-size: 14px; font-weight: 400; color: #000; }
.lvd-radio-circle { width: 18px; height: 18px; border-radius: 50%; border: 2px solid #1C4240; background: #FFFFFF; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: border-color 0.15s; }
.lvd-radio-circle::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: transparent; transition: background 0.15s; }
.lvd-radio-circle.lvd-radio-circle--on::after { background: #1C4240; }
.lvd-radio-circle.lvd-radio-circle--green { border-color: #009A6E; }
.lvd-radio-circle.lvd-radio-circle--green.lvd-radio-circle--on::after { background: #009A6E; }

/* ── Radio – list style (ex-radio) ──────────────────────────────────────────── */
.lvd-ex-radios { display: flex; flex-direction: column; gap: 12px; }
.lvd-ex-radios--indented { padding-left: 16px; }
.lvd-ex-radio-row { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
.lvd-ex-radio-row--indented { padding-left: 32px; }
.lvd-ex-radio-circle { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #1C4240; background: #FFFFFF; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; transition: border-color 0.15s; }
.lvd-ex-radio-circle::after { content: ''; width: 10px; height: 10px; border-radius: 50%; background: transparent; transition: background 0.15s; }
.lvd-ex-radio-circle.lvd-ex-radio-circle--green { border-color: #009A6E; }
.lvd-ex-radio-circle.lvd-ex-radio-circle--on { border-color: #009A6E; }
.lvd-ex-radio-circle.lvd-ex-radio-circle--on::after { background: #009A6E; }
.lvd-ex-radio-text { font-size: 16px; font-weight: 400; color: #303030; line-height: 19px; }

/* ── Preview box ─────────────────────────────────────────────────────────────── */
.lvd-preview-box { background: rgba(184,180,164,0.14); border-radius: 6px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.lvd-preview-header { display: flex; align-items: center; gap: 5px; }
.lvd-preview-label  { font-size: 12px; font-weight: 600; color: #AD4E02; letter-spacing: 0.5px; }
.lvd-preview-text   { font-size: 14px; font-weight: 400; color: #303030; line-height: 18px; }

/* ── Inline editable preview inputs ─────────────────────────────────────────── */
.lvd-ex-inline-row { display: flex; flex-direction: row; align-items: center; flex-wrap: wrap; gap: 8px; }
.lvd-ex-input-wrap { display: inline-flex; }
.lvd-ex-input-wrap--sm .lvd-ex-input { width: 48px; text-align: center; }
.lvd-ex-input { height: 36px; width: 220px; padding: 0 12px; border: 1px solid #1C4240; border-radius: 4px; background: #FFFFFF; font-family: 'Figtree', sans-serif; font-size: 14px; color: #303030; outline: none; transition: border-color 0.15s, border-width 0.15s, padding 0.15s; }
.lvd-ex-input:focus { border-width: 2px; border-color: #1C4240; padding: 0 11px; }
.lvd-ex-input::placeholder { color: #727272; }

/* ── Info row (no-content message) ──────────────────────────────────────────── */
.lvd-mat-info-row { display: flex; align-items: center; gap: 8px; }
.lvd-mat-info-text { font-size: 14px; font-weight: 400; color: #303030; line-height: 18px; }

/* ── Transition ──────────────────────────────────────────────────────────────── */
.lvd-mat-body-enter-active, .lvd-mat-body-leave-active { transition: max-height 0.28s ease, opacity 0.2s ease; overflow: hidden; max-height: 800px; }
.lvd-mat-body-enter-from, .lvd-mat-body-leave-to { max-height: 0; opacity: 0; }
</style>