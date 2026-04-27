<script setup lang="ts">
import { AccordionItem } from '@upov/upov-ui';

defineProps<{
  number: string;
  title: string;
  open?: boolean;
}>();
</script>

<template>
  <AccordionItem :number="number" :title="title" :default-open="open">
    <slot />
  </AccordionItem>
</template>
