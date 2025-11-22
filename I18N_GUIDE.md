# 다국어 블로그 가이드

이 블로그는 영어(en)와 한국어(ko) 두 가지 언어를 지원합니다.

## 주요 기능

### 1. 언어 자동 감지
- 처음 방문 시 브라우저의 언어 설정을 감지하여 자동으로 언어 설정
- 한국어 브라우저 → 한국어로 표시
- 그 외 → 영어로 표시

### 2. 언어 전환
- 헤더의 언어 전환 버튼(🌐)을 클릭하여 언어 변경
- 선택한 언어는 브라우저에 저장되어 다음 방문 시 유지

### 3. 언어별 포스트
- 각 포스트는 언어별로 별도 작성
- 해당 언어로 작성되지 않은 포스트는 표시되지 않음

## 블로그 포스트 작성 방법

### 파일명 규칙
포스트 파일은 언어 코드를 포함한 파일명으로 작성합니다:

```
data/blog/포스트제목.en.mdx  (영어 버전)
data/blog/포스트제목.ko.mdx  (한국어 버전)
```

### 예시

**영어 포스트** (`data/blog/my-post.en.mdx`):
```mdx
---
title: 'My First Post'
date: '2024-01-15'
tags: ['welcome', 'tutorial']
draft: false
summary: 'This is my first blog post in English.'
---

# Welcome!

This is the content of my post in English.
```

**한국어 포스트** (`data/blog/my-post.ko.mdx`):
```mdx
---
title: '나의 첫 포스트'
date: '2024-01-15'
tags: ['welcome', 'tutorial']
draft: false
summary: '한국어로 작성한 첫 번째 블로그 포스트입니다.'
---

# 환영합니다!

한국어로 작성된 포스트 내용입니다.
```

> **중요**: 태그는 영어와 한국어 포스트 모두 **동일한 영어 slug**를 사용합니다!

### 주의사항

1. **파일명**: 언어 코드(`.en` 또는 `.ko`)를 반드시 `.mdx` 앞에 포함
2. **동일한 slug**: 같은 포스트의 다른 언어 버전은 언어 코드를 제외한 파일명이 동일해야 함
3. **필수 필드**: `title`, `date`, `summary`는 필수 항목
4. **태그**: **영어 slug로만 작성** (예: `['welcome', 'introduction']`)

## 프로젝트 구조

```
lib/
  i18n/
    i18n-context.tsx             # 언어 컨텍스트
    filter-posts.ts              # 포스트 필터링 함수
    tag-translations.ts          # 태그 번역 함수
    utils.ts                     # i18n 유틸리티
    locales/
      en.json                    # 영어 UI 번역
      ko.json                    # 한국어 UI 번역
      tag-translations.json      # 태그 번역

components/
  LanguageSwitch.tsx             # 언어 전환 컴포넌트

data/
  blog/
    welcome.en.mdx               # 영어 포스트 예시
    welcome.ko.mdx               # 한국어 포스트 예시
```

## 태그 번역 관리

태그는 **영어 slug로 통일**하고, 표시할 때만 현재 언어로 번역됩니다.

### 태그 번역 추가/수정

`lib/i18n/locales/tag-translations.json` 파일을 편집합니다:

```json
{
  "welcome": {
    "en": "Welcome",
    "ko": "환영"
  },
  "web-development": {
    "en": "Web Development",
    "ko": "웹개발"
  }
}
```

### 포스트에서 태그 사용

포스트의 frontmatter에는 **영어 slug만** 사용합니다:

```mdx
---
title: '나의 첫 포스트'
tags: ['welcome', 'web-development']
---
```

태그는 자동으로 현재 언어에 맞게 번역되어 표시됩니다:
- 영어: Welcome, Web Development
- 한국어: 환영, 웹개발

## UI 텍스트 번역

UI 텍스트를 추가하거나 수정하려면 다음 파일을 편집합니다:

- `lib/i18n/locales/en.json` (영어)
- `lib/i18n/locales/ko.json` (한국어)

### 사용 예시

```typescript
import { useI18n } from '@/lib/i18n/i18n-context'

function MyComponent() {
  const { t } = useI18n()
  
  return <div>{t('blog.readMore')}</div>
}
```

## 빌드 및 실행

```bash
# 개발 서버 실행
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 서버 실행
pnpm serve
```

## 문제 해결

### 포스트가 표시되지 않는 경우
1. 파일명에 언어 코드(`.en.mdx` 또는 `.ko.mdx`)가 올바르게 포함되어 있는지 확인
2. frontmatter의 `draft` 필드가 `false`인지 확인
3. 현재 선택된 언어와 포스트 언어가 일치하는지 확인

### 언어 전환이 작동하지 않는 경우
1. 브라우저의 로컬 스토리지를 확인
2. 페이지를 새로고침

### 빌드 오류
1. Contentlayer 캐시 삭제: `.contentlayer` 폴더 삭제 후 재빌드
2. 의존성 재설치: `pnpm install`

