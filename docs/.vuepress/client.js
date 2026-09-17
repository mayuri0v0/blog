import { defineClientConfig } from 'vuepress/client'
import CommentService from './components/CommentService.vue'

export default defineClientConfig({
  enhance({ app }) {
    app.component('CommentService', CommentService)
  },
})
