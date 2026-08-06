import { type ComputedFields, defineDocumentType, makeSource } from 'contentlayer2/source-files'
import { extractTocHeadings, remarkExtractFrontmatter } from 'pliny/mdx-plugins/index.js'
import readingTime from 'reading-time'
import { extractLanguageFromFilename, removeLanguageFromPath } from './lib/i18n/utils'
import { sharedRehypePlugins, sharedRemarkPlugins } from './lib/mdx/plugins'
import { smartQuotes } from './lib/utils'

const computedFields: ComputedFields = {
  readingTime: { type: 'json', resolve: (doc) => readingTime(doc.body.raw) },
  slug: {
    type: 'string',
    resolve: (doc) => {
      const path = doc._raw.flattenedPath.replace(/^.+?(\/)/, '')
      return removeLanguageFromPath(path)
    },
  },
  path: {
    type: 'string',
    resolve: (doc) => {
      return removeLanguageFromPath(doc._raw.flattenedPath)
    },
  },
  filePath: {
    type: 'string',
    resolve: (doc) => doc._raw.sourceFilePath,
  },
  toc: { type: 'json', resolve: (doc) => extractTocHeadings(doc.body.raw) },
  language: {
    type: 'string',
    resolve: (doc) => {
      const lang = extractLanguageFromFilename(doc._raw.sourceFileName)
      // 언어 코드가 없으면 빈 문자열 반환 (모든 언어에서 표시됨)
      return lang || ''
    },
  },
  localizedPath: {
    type: 'string',
    resolve: (doc) => {
      const lang = extractLanguageFromFilename(doc._raw.sourceFileName) || 'en'
      const basePath = removeLanguageFromPath(doc._raw.flattenedPath)
      return `${basePath}?lang=${lang}`
    },
  },
}

export const Authors = defineDocumentType(() => ({
  name: 'Authors',
  filePathPattern: 'authors/**/*.mdx',
  contentType: 'mdx',
  fields: {
    name: { type: 'string', required: true },
    avatar: { type: 'string' },
    occupation: { type: 'string' },
    company: { type: 'string' },
    email: { type: 'string' },
    twitter: { type: 'string' },
    bluesky: { type: 'string' },
    linkedin: { type: 'string' },
    github: { type: 'string' },
    layout: { type: 'string' },
  },
  computedFields,
}))

export const Projects = defineDocumentType(() => ({
  name: 'Projects',
  filePathPattern: 'projects/**/*.mdx',
  contentType: 'mdx',
  fields: {
    title: { type: 'string', required: true },
    description: { type: 'string', required: true },
    imgSrc: { type: 'string' },
    href: { type: 'string' },
    period: { type: 'string' },
    role: { type: 'string' },
    company: { type: 'string' },
    tags: { type: 'list', of: { type: 'string' } },
  },
  computedFields: {
    ...computedFields,
    // title과 description에 스마트 따옴표 적용
    title: {
      type: 'string',
      resolve: (doc) => smartQuotes(doc.title),
    },
    description: {
      type: 'string',
      resolve: (doc) => smartQuotes(doc.description),
    },
  },
}))

export default makeSource({
  contentDirPath: 'data',
  // 블로그 글은 DB로 이전됨 — data/blog는 마이그레이션 백업용으로만 유지
  contentDirExclude: ['blog'],
  documentTypes: [Authors, Projects],
  mdx: {
    cwd: process.cwd(),
    remarkPlugins: [remarkExtractFrontmatter, ...sharedRemarkPlugins],
    rehypePlugins: [...sharedRehypePlugins],
  },
})
