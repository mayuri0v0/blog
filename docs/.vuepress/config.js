import { viteBundler } from '@vuepress/bundler-vite'
import { defaultTheme } from '@vuepress/theme-default'
import { markdownContainerPlugin } from '@vuepress/plugin-markdown-container'
import { markdownMathPlugin } from '@vuepress/plugin-markdown-math'
import { defineUserConfig } from 'vuepress'
import { sidebar } from './sidebar.js'

export default defineUserConfig({
  bundler: viteBundler(),
  base: '/',
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
    ],
    sidebar,
    repo: 'mayuri0v0/blog',
    docsBranch: 'main',
    docsDir: 'docs',
    // 显式关闭「编辑此页」链接（默认主题 editLink 默认为 true）
    editLink: false,
    // 默认主题的插件配置需放在 themePlugins 下
    themePlugins: {
      // 默认主题内置 prismjs 做代码高亮，这里配置预加载语言
      prismjs: {
        preloadLanguages: [
          'csharp', 'c', 'cpp', 'bash', 'json',
          'javascript', 'typescript', 'python', 'java',
        ],
      },
      // 禁用页面底部的贡献者（Contributors）显示
      git: { contributors: false },
    },
  }),
})
