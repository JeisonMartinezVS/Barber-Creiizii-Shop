<script setup lang="ts">
import Header from './components/Header.vue'
import Footer from './components/Footer.vue'
</script>

<template>
  <Header />
  <main class="pt-16">
    <router-view />
  </main>
  <Footer />
</template>

<style scoped>
* {
  background: black;
}
</style>
