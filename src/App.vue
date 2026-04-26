<script setup lang="ts">
import ErrorBoundary from '@/components/ErrorBoundary.vue';
import PageHeader from '@/components/PageHeader.vue';
import Main from '@/Main.vue';
</script>

<template>
  <ErrorBoundary>
    <div>
      <PageHeader title="" />
      <Main />
    </div>
  </ErrorBoundary>
</template>

<style scoped></style>
