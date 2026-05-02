<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="loading-overlay"
    >
      <div class="loading-content">
        <i class="fas fa-spinner fa-spin loading-icon" />
        <p
          v-if="text"
          class="loading-text"
        >
          {{ text }}
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  text?: string
}>()
</script>

<style scoped>
@import url('@/static/css/animations.css');

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9998;
}

.loading-content {
  text-align: center;
  color: #fff;
}

.loading-icon {
  font-size: 48px;
  color: #0cd;
  margin-bottom: 16px;
}

.loading-text {
  font-size: 16px;
  color: #ddd;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* Reduced motion: disable fa-spin animation */
@media (prefers-reduced-motion: reduce) {
  .loading-icon.fa-spin {
    animation: none;
  }
}
</style>
