import React, { useState, useEffect } from 'react'
import { getUsageStats, clearUsageLog, samAccount } from './sam.js'
import './UsagePanel.css'

function UsagePanel({ refreshTrigger }) {
  const [stats, setStats] = useState(null)
  const [account, setAccount] = useState(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setStats(getUsageStats())
  }, [refreshTrigger])

  useEffect(() => {
    samAccount().then(setAccount)
  }, [])

  function handleClear() {
    clearUsageLog()
    setStats(getUsageStats())
  }

  if (!stats) return null

  return (
    <div className="usage-panel">
      <button
        className="usage-toggle"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="usage-toggle-icon">📊</span>
        <span className="usage-toggle-label">사용량 리포트</span>
        <span className="usage-toggle-cost">
          ${stats.estimatedCost.toFixed(4)}
        </span>
        <span className={`usage-chevron ${expanded ? 'open' : ''}`}>▾</span>
      </button>

      {expanded && (
        <div className="usage-content">
          {/* Account Info */}
          {account && (
            <div className="usage-account">
              <h4>계정 상태</h4>
              <div className="account-grid">
                {account.plan && (
                  <div className="account-item">
                    <span className="account-label">플랜</span>
                    <span className="account-value">{account.plan}</span>
                  </div>
                )}
                {account.budget && (
                  <div className="account-item">
                    <span className="account-label">예산</span>
                    <span className="account-value">
                      ${account.budget.used?.toFixed(2) || '0'} / ${account.budget.limit?.toFixed(2) || '∞'}
                    </span>
                  </div>
                )}
                {account.usage && (
                  <div className="account-item">
                    <span className="account-label">이번 달</span>
                    <span className="account-value">${account.usage.current_month?.toFixed(4) || '0'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session Stats */}
          <div className="usage-stats">
            <h4>이번 세션</h4>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-number">{stats.totalCalls}</span>
                <span className="stat-label">총 호출</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.searchCalls}</span>
                <span className="stat-label">검색</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.generateCalls}</span>
                <span className="stat-label">AI 생성</span>
              </div>
              <div className="stat-card highlight">
                <span className="stat-number">${stats.estimatedCost.toFixed(4)}</span>
                <span className="stat-label">예상 비용</span>
              </div>
            </div>

            <div className="token-stats">
              <div className="token-row">
                <span>입력 토큰</span>
                <span className="token-value">{stats.totalInputTokens.toLocaleString()}</span>
              </div>
              <div className="token-row">
                <span>출력 토큰</span>
                <span className="token-value">{stats.totalOutputTokens.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Call Log */}
          {stats.entries.length > 0 && (
            <div className="usage-log">
              <h4>호출 로그</h4>
              <div className="log-list">
                {stats.entries.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="log-entry">
                    <div className="log-entry-header">
                      <span className={`log-type log-type-${entry.type}`}>
                        {entry.type === 'search' ? '🔍' : '🤖'} {entry.type}
                      </span>
                      <span className="log-cost">${entry.cost?.toFixed(5) || '—'}</span>
                    </div>
                    <div className="log-entry-details">
                      <span className="log-model">{entry.model}</span>
                      <span className="log-time">{entry.elapsed}ms</span>
                      {entry.usage && (
                        <span className="log-tokens">
                          {(entry.usage.input_tokens || entry.usage.prompt_tokens || 0).toLocaleString()}→
                          {(entry.usage.output_tokens || entry.usage.completion_tokens || 0).toLocaleString()} tok
                        </span>
                      )}
                    </div>
                    {entry.query && (
                      <div className="log-query">{entry.query.slice(0, 60)}...</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="clear-btn" onClick={handleClear}>
            로그 초기화
          </button>
        </div>
      )}
    </div>
  )
}

export default UsagePanel
