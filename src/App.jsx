import React, { useState, useEffect } from 'react'
import { searchAndProcess } from './sam.js'
import UsagePanel from './UsagePanel.jsx'
import './App.css'

const ACCESS_CODE = 'soonsoon2026'
const AUTH_KEY = 'snu_wemeet_auth'

function AuthGate({ onAuth }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (code === ACCESS_CODE) {
      sessionStorage.setItem(AUTH_KEY, 'true')
      onAuth()
    } else {
      setError(true)
      setTimeout(() => setError(false), 1500)
    }
  }

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <span className="auth-icon">◆</span>
        <h2 className="auth-title">Japan Safety Intelligence</h2>
        <p className="auth-desc">테스트 접근 코드를 입력하세요</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access Code"
            className={`auth-input ${error ? 'auth-error' : ''}`}
            autoFocus
          />
          <button type="submit" className="auth-btn">입장</button>
        </form>
        {error && <p className="auth-error-msg">코드가 올바르지 않습니다</p>}
        <p className="auth-footer">PoC — SNU WeMeet × i2max</p>
      </div>
    </div>
  )
}

const PRESET_TOPICS = [
  { id: 'safety', label: '산업안전 규제', query: '일본 산업안전보건법 개정 최신' },
  { id: 'accident', label: '사고 사례', query: '일본 산업재해 사고 사례 분석' },
  { id: 'education', label: '안전교육', query: '일본 산업안전 교육 프로그램 훈련' },
  { id: 'tech', label: '안전기술', query: '일본 산업안전 IoT AI 기술 도입' },
  { id: 'policy', label: '정책동향', query: '일본 후생노동성 산업안전 정책 2025' },
]

const CATEGORY_COLORS = {
  '산업안전': '#4cda8a',
  '교육정책': '#7c5cfc',
  '법규변경': '#fcb85c',
  '사고사례': '#fc5c8c',
  '기술동향': '#5cc8fc',
}

function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(AUTH_KEY) === 'true')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeTopic, setActiveTopic] = useState(null)
  const [customQuery, setCustomQuery] = useState('')
  const [rawSearch, setRawSearch] = useState(null)
  const [usageRefresh, setUsageRefresh] = useState(0)

  if (!authed) {
    return <AuthGate onAuth={() => setAuthed(true)} />
  }

  async function handleSearch(query, topicId) {
    setLoading(true)
    setError(null)
    setActiveTopic(topicId)
    setResults([])
    setRawSearch(null)

    try {
      const data = await searchAndProcess(query)
      setRawSearch(data.search)
      if (data.processed) {
        setResults(data.processed)
      } else if (data.error) {
        setError(data.error)
      } else {
        setError('AI 처리 결과를 파싱할 수 없습니다. 원본 검색 결과를 확인하세요.')
      }
    } catch (err) {
      setError(`오류 발생: ${err.message}`)
    } finally {
      setLoading(false)
      setUsageRefresh((n) => n + 1)
    }
  }

  function handleCustomSearch(e) {
    e.preventDefault()
    if (customQuery.trim()) {
      handleSearch(customQuery.trim(), 'custom')
    }
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo-area">
            <span className="logo-mark">◆</span>
            <h1 className="logo-text">Japan Safety Intelligence</h1>
          </div>
          <p className="subtitle">
            일본 산업안전·교육 데이터 AI 분석 피드
          </p>
          <span className="badge">PoC — SNU WeMeet × i2max</span>
        </div>
      </header>

      <main className="main">
        <section className="search-section">
          <div className="topics">
            {PRESET_TOPICS.map((topic) => (
              <button
                key={topic.id}
                className={`topic-btn ${activeTopic === topic.id ? 'active' : ''}`}
                onClick={() => handleSearch(topic.query, topic.id)}
                disabled={loading}
              >
                {topic.label}
              </button>
            ))}
          </div>

          <form className="custom-search" onSubmit={handleCustomSearch}>
            <input
              type="text"
              placeholder="직접 검색어 입력 (예: JISHA 안전교육 가이드라인)"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !customQuery.trim()}>
              검색
            </button>
          </form>
        </section>

        {loading && (
          <div className="loading">
            <div className="loading-spinner" />
            <p>SAM Search Agent로 검색 중...</p>
            <p className="loading-sub">AI가 번역·요약·분류하고 있습니다</p>
          </div>
        )}

        {error && (
          <div className="error-box">
            <p>{error}</p>
          </div>
        )}

        {results.length > 0 && (
          <section className="results">
            <div className="results-header">
              <h2>분석 결과</h2>
              <span className="results-count">{results.length}건</span>
            </div>
            <div className="feed">
              {results.map((item, idx) => (
                <article
                  key={idx}
                  className="feed-item"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className="feed-item-top">
                    <span
                      className="category-tag"
                      style={{ background: CATEGORY_COLORS[item.category] || '#7c5cfc' }}
                    >
                      {item.category}
                    </span>
                    <span className={`importance importance-${item.importance}`}>
                      {item.importance === '상' ? '🔴 높음' : item.importance === '중' ? '🟡 보통' : '⚪ 낮음'}
                    </span>
                  </div>
                  <h3 className="feed-item-title">{item.title}</h3>
                  <p className="feed-item-summary">{item.summary}</p>
                  <div className="feed-item-meta">
                    {item.date && <span className="meta-date">{item.date}</span>}
                    {item.source && (
                      <a
                        href={item.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="meta-source"
                      >
                        원문 보기 →
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {rawSearch && (
          <details className="raw-section">
            <summary>원본 검색 결과 (디버그)</summary>
            <pre>{JSON.stringify(rawSearch, null, 2)}</pre>
          </details>
        )}
      </main>

      <footer className="footer">
        <p>Powered by SAM API — soonsoon.ai</p>
        <p className="footer-sub">데이터 소스: JISHA, JAISH, 일본 후생노동성, 교육기관</p>
      </footer>

      <UsagePanel refreshTrigger={usageRefresh} />
    </div>
  )
}

export default App
