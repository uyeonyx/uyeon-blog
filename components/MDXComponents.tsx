import type { MDXComponents } from 'mdx/types'
import TOCInline from 'pliny/ui/TOCInline'
import Image from './Image'
import IntroCard from './IntroCard'
import CustomLink from './Link'
import Pre from './Pre'
import TableWrapper from './TableWrapper'
import TechStack from './TechStack'
import Timeline from './Timeline'
import YouTube from './YouTube'

export const components: MDXComponents = {
  Image,
  // 순수 마크다운 이미지(![]())도 next/image 파이프라인을 태운다 — 블롭 업로드 이미지는
  // remarkImgToJsx(public/ 파일 전용)가 못 잡아서 생 <img>로 남기 때문
  img: Image as MDXComponents['img'],
  TOCInline,
  a: CustomLink,
  pre: Pre,
  table: TableWrapper,
  TechStack,
  IntroCard,
  Timeline,
  YouTube,
}
