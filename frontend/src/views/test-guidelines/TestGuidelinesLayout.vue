<template>
  <div class="tg-layout">
    <RouterView :key="$route.name" />
  </div>
</template>

<style scoped>
.tg-layout {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
