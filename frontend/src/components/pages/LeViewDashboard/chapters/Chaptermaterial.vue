<script setup lang="ts">
import { ref } from 'vue';

// ── Local state ───────────────────────────────────────────────────────────────
const materialSections = ref([
  { id: 'mat-2-1', number: '2.1', title: 'Title text',                isOpen: false },
  { id: 'mat-2-2', number: '2.2', title: 'Title text',                isOpen: false },
  { id: 'mat-2-3', number: '2.3', title: 'Seed Quality Requirements', isOpen: true  },
]);

const seedQualityRadio = ref<'seed-only' | 'both' | null>(null);

function toggleSection(id: string) {
  const s = materialSections.value.find(x => x.id === id);
  if (s) s.isOpen = !s.isOpen;
}
</script>

<template>
  <div class="lvd-mat-accordion">

    <!-- 2.1 -->
    <div class="lvd-mat-card">
      <button class="lvd-mat-header" @click="toggleSection('mat-2-1')">
        <span class="lvd-mat-chevron">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path v-if="materialSections[0].isOpen" d="M4.5 11.25L9 6.75L13.5 11.25" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path v-else d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <h4 class="lvd-mat-title">{{ materialSections[0].number }} {{ materialSections[0].title }}</h4>
      </button>
      <Transition name="lvd-mat-body">
        <div v-if="materialSections[0].isOpen" class="lvd-mat-body">
          <p class="lvd-mat-empty">No content available.</p>
        </div>
      </Transition>
    </div>

    <!-- 2.2 -->
    <div class="lvd-mat-card">
      <button class="lvd-mat-header" @click="toggleSection('mat-2-2')">
        <span class="lvd-mat-chevron">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path v-if="materialSections[1].isOpen" d="M4.5 11.25L9 6.75L13.5 11.25" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path v-else d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <h4 class="lvd-mat-title">{{ materialSections[1].number }} {{ materialSections[1].title }}</h4>
      </button>
      <Transition name="lvd-mat-body">
        <div v-if="materialSections[1].isOpen" class="lvd-mat-body">
          <p class="lvd-mat-empty">No content available.</p>
        </div>
      </Transition>
    </div>

    <!-- 2.3 Seed Quality Requirements -->
    <div class="lvd-mat-card">
      <button class="lvd-mat-header" @click="toggleSection('mat-2-3')">
        <span class="lvd-mat-chevron">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path v-if="materialSections[2].isOpen" d="M4.5 11.25L9 6.75L13.5 11.25" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path v-else d="M4.5 6.75L9 11.25L13.5 6.75" stroke="#1C4240" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
        <h4 class="lvd-mat-title">{{ materialSections[2].number }} {{ materialSections[2].title }}</h4>
      </button>
      <Transition name="lvd-mat-body">
        <div v-if="materialSections[2].isOpen" class="lvd-mat-body lvd-mat-body--seed">
          <p class="lvd-mat-instruction">Please select one of the options (if applicable).</p>

          <div class="lvd-mat-radios">
            <label class="lvd-mat-radio-row" @click.prevent="seedQualityRadio = 'seed-only'">
              <span class="lvd-mat-radio-circle" :class="{ 'lvd-mat-radio-circle--on': seedQualityRadio === 'seed-only' }"></span>
              <span class="lvd-mat-radio-text">Test Guidelines which only apply to seed-propagated varieties:</span>
            </label>
            <label class="lvd-mat-radio-row" @click.prevent="seedQualityRadio = 'both'">
              <span class="lvd-mat-radio-circle" :class="{ 'lvd-mat-radio-circle--on': seedQualityRadio === 'both' }"></span>
              <span class="lvd-mat-radio-text">Test Guidelines which apply to seed-propagated varieties as well as other types of varieties:</span>
            </label>
          </div>

          <div class="lvd-mat-preview">
            <div class="lvd-mat-preview-hd">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M8.5 1H3a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V5.5L8.5 1ZM8.5 1v4.5H13" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M5 9.5h5M5 11.5h3" stroke="#AD4E02" stroke-width="1.2" stroke-linecap="round"/>
              </svg>
              <span class="lvd-mat-preview-tag">PREVIEW</span>
            </div>
            <div class="lvd-mat-info-row">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="6.5" stroke="#303030" stroke-width="1.1"/>
                <path d="M7.5 6.5V10.5" stroke="#303030" stroke-width="1.3" stroke-linecap="round"/>
                <circle cx="7.5" cy="4.5" r="0.8" fill="#303030"/>
              </svg>
              <span class="lvd-mat-info-text">There is currently no information to fill in.</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

  </div>
</template>

<style scoped>
.lvd-mat-accordion { display: flex; flex-direction: column; gap: 12px; }
.lvd-mat-card { background: #FFFFFF; border-radius: 8px; box-shadow: 0px 2px 8px rgba(70, 70, 70, 0.04); overflow: hidden; }
.lvd-mat-header {
  width: 100%; display: flex; align-items: center; gap: 12px;
  padding: 16px; background: none; border: none; cursor: pointer;
  text-align: left; font-family: 'Figtree', sans-serif; transition: background 0.12s;
}
.lvd-mat-header:hover { background: rgba(0, 0, 0, 0.02); }
.lvd-mat-chevron { display: flex; align-items: center; justify-content: center; width: 18px; height: 18px; flex-shrink: 0; }
.lvd-mat-title { font-family: 'Figtree', sans-serif; font-size: 18px; font-weight: 700; line-height: 22px; color: #303030; margin: 0; }
.lvd-mat-body { padding: 0 16px 20px; }
.lvd-mat-body--seed { display: flex; flex-direction: column; gap: 16px; padding: 0 16px 20px; }
.lvd-mat-empty { font-size: 14px; color: #727272; }
.lvd-mat-instruction { font-size: 15px; font-weight: 400; color: #303030; line-height: 19px; }
.lvd-mat-radios { display: flex; flex-direction: column; gap: 12px; }
.lvd-mat-radio-row { display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; }
.lvd-mat-radio-circle {
  width: 24px; height: 24px; border-radius: 50%;
  border: 2px solid #1C4240; background: #FFFFFF;
  display: inline-flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: border-color 0.15s;
}
.lvd-mat-radio-circle::after { content: ''; width: 8px; height: 8px; border-radius: 50%; background: transparent; transition: background 0.15s; }
.lvd-mat-radio-circle.lvd-mat-radio-circle--on { border-color: #009A6E; }
.lvd-mat-radio-circle.lvd-mat-radio-circle--on::after { background: #009A6E; }
.lvd-mat-radio-text { font-size: 16px; font-weight: 400; color: #303030; line-height: 1; }
.lvd-mat-preview { background: rgba(184, 180, 164, 0.14); border-radius: 6px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
.lvd-mat-preview-hd { display: flex; align-items: center; gap: 5px; }
.lvd-mat-preview-tag { font-size: 12px; font-weight: 600; color: #AD4E02; letter-spacing: 0.5px; }
.lvd-mat-info-row { display: flex; align-items: center; gap: 8px; }
.lvd-mat-info-text { font-size: 14px; font-weight: 400; color: #303030; line-height: 18px; }

.lvd-mat-body-enter-active, .lvd-mat-body-leave-active { transition: max-height 0.28s ease, opacity 0.2s ease; overflow: hidden; max-height: 500px; }
.lvd-mat-body-enter-from, .lvd-mat-body-leave-to { max-height: 0; opacity: 0; }
</style>