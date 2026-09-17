<script setup>
import ParentLayout from '@vuepress/theme-default/layouts/Layout.vue'
</script>

<template>
  <ParentLayout>
    <!-- 每个页面底部统一放置协议 -->
    <template #page-bottom>
      <footer class="license-footer">
        内容遵循
        <a
          href="https://creativecommons.org/licenses/by/4.0/deed.zh"
          target="_blank"
          rel="license"
        >
          CC BY 4.0
        </a>
        协议
      </footer>
    </template>
  </ParentLayout>
</template>

<style scoped>
.license-footer {
  text-align: center;
  padding: 1rem 0 1.5rem;
  color: var(--c-text-lighter, #999);
  font-size: 0.85rem;
}

.license-footer a {
  color: inherit;
  font-weight: 500;
}
</style>
