# SNU WeMeet PoC — Japan Safety Intelligence

일본 산업안전·교육 데이터를 AI로 수집·번역·요약하는 인텔리전스 피드 서비스 PoC.

## 기능

- SAM Search Agent를 활용한 일본 산업안전 데이터 검색
- AI 자동 번역 (일→한)
- 핵심 내용 요약 및 카테고리 분류
- 중요도 자동 판별

## 기술 스택

- React + Vite (정적 SPA)
- SAM API (검색 + AI 처리)
- GitHub Pages 배포

## 데이터 소스

- JISHA (일본 산업안전보건협회)
- JAISH (산업안전보건종합연구소)
- 일본 후생노동성
- 일본 교육기관 및 협회

## 로컬 실행

```bash
npm install
npm run dev
```

## 배포

`main` 브랜치에 push하면 GitHub Actions가 자동으로 GitHub Pages에 배포합니다.

---

SNU WeMeet × i2max PoC
