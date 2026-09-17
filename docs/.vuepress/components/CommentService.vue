<script setup>
import { onMounted, ref } from 'vue'
import 'gitalk/dist/gitalk.css'

const container = ref(null)

onMounted(async () => {
  // 动态加载 gitalk，避免 SSR 阶段访问浏览器 API
  const { default: Gitalk } = await import('gitalk')

  const gitalk = new Gitalk({
    clientID: 'Ov23ligSnClozsBimobF',
    clientSecret: 'fccf100394e1081b6477f42c44c609ab66135f13',
    repo: 'blog',
    owner: 'mayuri0v0',
    admin: ['mayuri0v0'],
    // 用页面路径作为评论 id，截断以避免超过 50 字符限制
    id: decodeURIComponent(location.pathname).slice(0, 50),
    distractionFreeMode: false,
    language: 'zh-CN',
  })
  gitalk.render(container.value)
})
</script>

<template>
  <div ref="container" class="gitalk-container"></div>
</template>
