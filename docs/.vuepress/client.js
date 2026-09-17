import { defineClientConfig } from 'vuepress/client'
import Layout from './layouts/Layout.vue'
import CommentService from './components/CommentService.vue'

export default defineClientConfig({
  layouts: {
    Layout,
  },
  enhance({ app }) {
    app.component('CommentService', CommentService)
  },
})
