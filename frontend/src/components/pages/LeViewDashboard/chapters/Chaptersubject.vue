<script setup lang="ts">
import { ref } from 'vue';
import type { RelatedLink } from './types';

// ── Props ────────────────────────────────────────────────────────────────────
const props = withDefaults(defineProps<{
  sectionLinks?: RelatedLink[];
}>(), {
  sectionLinks: () => [
    { text: 'More than one species (GN3)',                               url: '#' },
    { text: 'Different types or groups within a species or genus (GN4)', url: '#' },
    { text: 'Family name (GN5)',                                         url: '#' },
    { text: 'Guidance for New Types and Species (GN6)',                  url: '#' },
  ],
});

// ── Local state ───────────────────────────────────────────────────────────────
const radioAnswers = ref<Record<string, 'yes' | 'no' | null>>({
  q1: 'no',
  q2: 'no',
});

function setRadio(key: string, value: 'yes' | 'no') {
  radioAnswers.value[key] = value;
}
</script>

<template>
  <div class="lvd-section-card">
    <div class="lvd-block">

      <h2 class="lvd-block-title">1.1 Standard items are configured by default</h2>

      <div class="lvd-section-links">
        <span class="lvd-links-label">Related links:</span>
        <div class="lvd-section-links-items">
          <a
            v-for="(lnk, i) in props.sectionLinks"
            :key="i"
            :href="lnk.url || '#'"
            target="_blank"
            class="lvd-link"
          >
            {{ lnk.text }}
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M4.875 2.438H2.438A1.063 1.063 0 0 0 1.375 3.5v7.063A1.063 1.063 0 0 0 2.438 11.624H9.5a1.063 1.063 0 0 0 1.063-1.062V8.125M7.813 1.375H11.625M11.625 1.375V5.188M11.625 1.375L4.875 8.125" stroke="#1C4240" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
        </div>
      </div>

      <!-- Question 1.1.1 -->
      <div class="lvd-question">
        <h3 class="lvd-q-label">1.1.1 Title text</h3>
        <p class="lvd-q-text">
          Should clarification be provided that any other species or hybrids not explicitly
          covered by these Test Guidelines should be treated according to the provisions of
          document TGP/12 "Guidance for New Types and Species"
          <span class="lvd-required">*</span>
        </p>
        <div class="lvd-radio-group">
          <label class="lvd-radio-opt" @click.prevent="setRadio('q1', 'yes')">
            <span class="lvd-radio-circle" :class="{ 'lvd-radio-circle--on': radioAnswers.q1 === 'yes' }"></span>
            <span class="lvd-radio-text">Yes</span>
          </label>
          <label class="lvd-radio-opt" @click.prevent="setRadio('q1', 'no')">
            <span class="lvd-radio-circle lvd-radio-circle--green" :class="{ 'lvd-radio-circle--on': radioAnswers.q1 === 'no' }"></span>
            <span class="lvd-radio-text">No</span>
          </label>
        </div>
        <button class="lvd-add-para-btn">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7.5" stroke="#1C4240" stroke-width="1.3"/>
            <path d="M9 6v6M6 9h6" stroke="#1C4240" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          Add Paragraph
        </button>
      </div>

      <!-- Question 1.1.2 -->
      <div class="lvd-question">
        <h3 class="lvd-q-label">1.1.2 Title text</h3>
        <p class="lvd-q-text">
          Might it be necessary to add additional characteristics or additional states of
          expressions for ornamental, fruit, industrial, vegetable, agricultural or other varieties?
          <span class="lvd-required">*</span>
        </p>
        <div class="lvd-radio-group">
          <label class="lvd-radio-opt" @click.prevent="setRadio('q2', 'yes')">
            <span class="lvd-radio-circle" :class="{ 'lvd-radio-circle--on': radioAnswers.q2 === 'yes' }"></span>
            <span class="lvd-radio-text">Yes</span>
          </label>
          <label class="lvd-radio-opt" @click.prevent="setRadio('q2', 'no')">
            <span class="lvd-radio-circle lvd-radio-circle--green" :class="{ 'lvd-radio-circle--on': radioAnswers.q2 === 'no' }"></span>
            <span class="lvd-radio-text">No</span>
          </label>
        </div>
      </div>

      <!-- Preview -->
      <div class="lvd-preview-box">
        <div class="lvd-preview-header">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M8.5 1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5.5L8.5 1ZM8.5 1v4.5H13" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5 9.5h5M5 11.5h3" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          <span class="lvd-preview-label">PREVIEW</span>
        </div>
        <p class="lvd-preview-text">
          1.1 These Test Guidelines apply to all varieties of Argania spinosa (L.) Skeels.
          Continue Sentence
        </p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.lvd-section-card {
  background: #FFFFFF;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(70, 70, 70, 0.06);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.lvd-block { display: flex; flex-direction: column; gap: 12px; }
.lvd-block-title { font-size: 18px; font-weight: 700; color: #303030; line-height: 22px; }
.lvd-section-links { display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
.lvd-section-links-items { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.lvd-links-label { font-size: 13px; font-weight: 400; color: #303030; white-space: nowrap; }
.lvd-link {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 13px; font-weight: 600; color: #1C4240;
  text-decoration: underline; text-decoration-color: #DADE14;
  text-decoration-thickness: 2px; text-underline-offset: 2px;
  cursor: pointer; transition: opacity 0.15s;
}
.lvd-link:hover { opacity: 0.7; }
.lvd-question { display: flex; flex-direction: column; gap: 10px; }
.lvd-q-label  { font-size: 16px; font-weight: 700; color: #303030; line-height: 20px; }
.lvd-q-text   { font-size: 14px; font-weight: 400; color: #303030; line-height: 20px; }
.lvd-required { color: #D32F2F; margin-left: 2px; }
.lvd-radio-group { display: flex; align-items: center; gap: 24px; }
.lvd-radio-opt { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.lvd-radio-text { font-size: 14px; font-weight: 400; color: #000; }
.lvd-radio-circle {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid #1C4240; background: #FFFFFF;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: border-color 0.15s;
}
.lvd-radio-circle::after {
  content: ''; width: 8px; height: 8px; border-radius: 50%;
  background: transparent; transition: background 0.15s;
}
.lvd-radio-circle.lvd-radio-circle--on::after { background: #1C4240; }
.lvd-radio-circle.lvd-radio-circle--green { border-color: #009A6E; }
.lvd-radio-circle.lvd-radio-circle--green.lvd-radio-circle--on::after { background: #009A6E; }
.lvd-add-para-btn {
  display: inline-flex; align-items: center; gap: 8px;
  height: 36px; padding: 0 16px; background: #FFFFFF;
  border: 1px solid #939600; border-radius: 100px; cursor: pointer;
  font-size: 14px; font-weight: 600; color: #1C4240;
  align-self: flex-start; transition: background 0.15s;
}
.lvd-add-para-btn:hover { background: rgba(147, 150, 0, 0.06); }
.lvd-preview-box { background: rgba(184, 180, 164, 0.14); border-radius: 6px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.lvd-preview-header { display: flex; align-items: center; gap: 5px; }
.lvd-preview-label  { font-size: 12px; font-weight: 600; color: #AD4E02; letter-spacing: 0.5px; }
.lvd-preview-text   { font-size: 14px; font-weight: 400; color: #303030; line-height: 18px; }
</style>