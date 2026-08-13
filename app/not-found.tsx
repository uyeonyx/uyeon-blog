// notFound() throw가 도달하는 루트 404 — 라우트 미매칭의 global-not-found와 동일 문서를 재사용한다.
// (루트 레이아웃이 없는 구조라 이 파일도 <html>부터 직접 렌더하는 전체 문서여야 한다)
export { default, metadata } from './global-not-found'
