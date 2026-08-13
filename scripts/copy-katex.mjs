// katex CSS + 폰트를 public/static/katex/로 자가 호스팅한다.
// CSS를 정적 import하면 청크 그래프에 붙어 조건부 로드가 불가능하므로,
// 수식이 있는 글에서만 <link precedence>로 넣기 위해 파일로 복사한다.
// 실행: pnpm prepare-assets (dev/build 앞단에서 자동)
import { cpSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules', 'katex', 'dist')
const dest = join(root, 'public', 'static', 'katex')

mkdirSync(dest, { recursive: true })
cpSync(join(src, 'katex.min.css'), join(dest, 'katex.min.css'))
// CSS의 url(fonts/…) 상대경로가 그대로 동작하도록 폰트 디렉터리째 복사
cpSync(join(src, 'fonts'), join(dest, 'fonts'), { recursive: true })
console.log('[katex] copied katex.min.css + fonts -> public/static/katex/')
