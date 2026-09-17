import { viteBundler } from '@vuepress/bundler-vite'
import { defaultTheme } from '@vuepress/theme-default'
import { markdownContainerPlugin } from '@vuepress/plugin-markdown-container'
import { markdownMathPlugin } from '@vuepress/plugin-markdown-math'
import { defineUserConfig } from 'vuepress'

export default defineUserConfig({
  bundler: viteBundler(),
  base: '/blog/',
  lang: 'zh-CN',
  title: 'mayuri0v0的怀表',
  description: '逆向与 CTF 学习笔记',

  plugins: [
    // KaTeX 数学公式
    markdownMathPlugin({
      type: 'katex',
      delimiters: 'dollars',
    }),

    // 自定义容器：定义
    markdownContainerPlugin({
      type: 'definition',
      before: (info) => `<div class="definition"><p class="title">${info}</p>`,
      after: () => '</div>',
    }),
    // 自定义容器：定理
    markdownContainerPlugin({
      type: 'theorem',
      before: (info) => `<div class="theorem"><p class="title">${info}</p>`,
      after: () => '</div>',
    }),
    // 自定义容器：结论
    markdownContainerPlugin({
      type: 'conclusion',
      before: (info) => `<div class="conclusion"><p class="title">${info}</p>`,
      after: () => '</div>',
    }),
    // 自定义容器：算法
    markdownContainerPlugin({
      type: 'algorithm',
      before: (info) => `<div class="algorithm"><p class="title">${info}</p>`,
      after: () => '</div>',
    }),
  ],

  theme: defaultTheme({
    navbar: [
      { text: '首页', link: '/' },
      { text: 'CTF', link: '/categories/ctf.html' },
      { text: '未归类', link: '/categories/other.html' },
    ],
    sidebar: [
      {
        text: 'CTF',
        collapsible: false,
        children: [
          '/posts/crackmes-passordkeygen.md',
          '/posts/ctf2-reverse3.md',
        ],
      },
      {
        text: '未归类',
        collapsible: false,
        children: [
          '/posts/unity-mono-mod.md',
          '/posts/steamless.md',
        ],
      },
    ],
    // 默认主题内置 prismjs 做代码高亮，这里配置预加载语言
    prismjs: {
      preloadLanguages: [
        'csharp', 'c', 'cpp', 'bash', 'json',
        'javascript', 'typescript', 'python', 'java',
      ],
    },
    repo: 'mayuri0v0/blog',
    docsBranch: 'main',
    docsDir: 'docs',
    editLink: true,
    editLinkText: '帮助我改善此页面！',
    // 注：lastUpdated 已由内置 @vuepress/plugin-git 提供，默认关闭，需要可设为 true
  }),
})
