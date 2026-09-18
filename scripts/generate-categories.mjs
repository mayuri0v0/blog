// 自动生成分类页面、侧边栏与首页分类列表。
// 依据每篇文章 frontmatter 里的 category 和 date 字段自动归类,无需手动维护链接。
// 会在 docs:dev / docs:build 之前自动运行(predocs:dev / predocs:build)。
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DOCS_DIR = join(__dirname, '..', 'docs')
const POSTS_DIR = join(DOCS_DIR, 'posts')
const CATEGORIES_DIR = join(DOCS_DIR, 'categories')

// 分类注册表:新增分类时在这里加一条即可。
// slug   —— 分类页文件名与 URL 中的英文标识
// name   —— 文章 frontmatter 里 category 字段的值,同时也是侧边栏/分类页的显示名
// description —— 分类页标题下的说明文字
const CATEGORIES = [
  { slug: 'ctf', name: 'CTF', description: 'CTF WriteUp。' },
  { slug: 'other', name: '未归类', description: 'Not Classified。' },
]

// 解析 markdown 的 frontmatter(仅支持简单的 key: value 标量字段)
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const frontmatter = {}
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    // 去掉首尾引号(单引号或双引号)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    frontmatter[key] = value
  }
  return frontmatter
}

function main() {
  // 读取所有文章
  const posts = readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const raw = readFileSync(join(POSTS_DIR, f), 'utf8')
      const fm = parseFrontmatter(raw)
      return {
        filename: f,
        slug: f.replace(/\.md$/, ''),
        title: fm.title || f,
        date: fm.date || '',
        category: fm.category || '',
      }
    })

  // 按分类分组
  const byCategory = new Map(CATEGORIES.map((c) => [c.name, []]))
  for (const p of posts) {
    let bucket = byCategory.get(p.category)
    if (!bucket) {
      console.warn(`[generate] 文章「${p.filename}」的 category「${p.category}」未注册,已归入「未归类」`)
      bucket = byCategory.get('未归类') || []
    }
    bucket.push(p)
  }

  // 每个分类内按日期升序(旧 → 新)
  for (const cat of CATEGORIES) {
    byCategory.get(cat.name).sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }

  // 生成分类页面
  mkdirSync(CATEGORIES_DIR, { recursive: true })
  for (const cat of CATEGORIES) {
    const list = byCategory.get(cat.name)
    const lines = [
      '---',
      `title: ${cat.name}`,
      '---',
      '',
      `# ${cat.name}`,
      '',
    ]
    if (cat.description) {
      lines.push(cat.description, '')
    }
    lines.push(...list.map((p) => `- [${p.title}](../posts/${p.slug}.html)（${p.date}）`), '')
    writeFileSync(join(CATEGORIES_DIR, `${cat.slug}.md`), lines.join('\n'), 'utf8')
  }

  // 生成侧边栏模块(被 config.js 引用)
  const sidebarItems = CATEGORIES.map((cat) => {
    const children = byCategory.get(cat.name).map((p) => `      '/posts/${p.slug}.md',`)
    const childrenBlock = children.length
      ? ['    children: [', ...children, '    ],'].join('\n')
      : '    children: [],'
    return [
      '  {',
      `    text: '${cat.name}',`,
      `    link: '/categories/${cat.slug}.html',`,
      '    collapsible: false,',
      childrenBlock,
      '  },',
    ].join('\n')
  })
  const sidebarContent =
    '// 此文件由 scripts/generate-categories.mjs 自动生成,请勿手动编辑。\n\n' +
    `export const sidebar = [\n${sidebarItems.join('\n')}\n]\n`
  writeFileSync(join(DOCS_DIR, '.vuepress', 'sidebar.js'), sidebarContent, 'utf8')

  // 生成首页分类列表
  const readmeLines = [
    '## 分类',
    '',
    ...CATEGORIES.map((cat) => `- [${cat.name}](./categories/${cat.slug}.html)`),
    '',
  ]
  writeFileSync(join(DOCS_DIR, 'README.md'), readmeLines.join('\n'), 'utf8')

  console.log('[generate] 已生成分类页面、.vuepress/sidebar.js 与 README.md')
}

main()
