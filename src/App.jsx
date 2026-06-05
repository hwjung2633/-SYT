import { useState, useMemo, useEffect } from 'react'

const ASSET_META = {
  samsung: { label: '삼성전자',  icon: '📱', desc: '코스피 대장주',  color: '#4A9EFF' },
  skhynix: { label: 'SK하이닉스', icon: '💾', desc: '반도체 대표주', color: '#FF6B6B' },
  kospi:   { label: 'KOSPI',     icon: '📊', desc: '코스피 지수',   color: '#34D399' },
  sp500:   { label: 'S&P 500',   icon: '🇺🇸', desc: '미국 대형주',  color: '#818CF8' },
  nasdaq:  { label: '나스닥',    icon: '⚡', desc: '미국 기술주',   color: '#38BDF8' },
  bitcoin: { label: '비트코인',  icon: '₿',  desc: '고위험 고수익', color: '#F59E0B' },
}

const FALLBACK_RATES = {
  samsung: 0.12, skhynix: 0.18, kospi: 0.08,
  sp500:   0.105, nasdaq:  0.15, bitcoin: 0.50,
}

const MONTH_OPTIONS = [6, 12, 18, 24]

// ── 유틸
function safeRate(r, key) {
  return (typeof r === 'number' && isFinite(r)) ? r : FALLBACK_RATES[key]
}

function fmt(n, short = false) {
  if (!isFinite(n)) return '—'
  const abs  = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (short) {
    if (abs >= 1e8) return sign + (abs / 1e8).toFixed(1) + '억'
    if (abs >= 1e4) return sign + Math.round(abs / 1e4).toLocaleString() + '만'
    return sign + abs.toLocaleString()
  }
  if (abs >= 1e8) {
    const e = Math.floor(abs / 1e8)
    const r = Math.round((abs % 1e8) / 1e4)
    return sign + (r > 0 ? `${e}억 ${r}만원` : `${e}억원`)
  }
  if (abs >= 1e4) return sign + Math.round(abs / 1e4).toLocaleString() + '만원'
  return sign + abs.toLocaleString() + '원'
}

function fmtRate(r) {
  if (!isFinite(r)) return '···'
  const pct = (r * 100).toFixed(1)
  return r >= 0 ? `+${pct}%` : `${pct}%`
}

// ── 슬라이더
function Slider({ value, min, max, step, onChange, color }) {
  const ratio = (value - min) / (max - min)
  const pct   = (ratio * 100).toFixed(2) + '%'
  return (
    <div className="custom-slider">
      <div className="slider-track">
        <div className="slider-fill" style={{ width: pct, background: color }} />
        <div className="slider-thumb" style={{ left: pct, borderColor: color, color }} />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
      />
    </div>
  )
}

// ── SVG 라인 차트
function MiniChart({ deposit, months, rate, color }) {
  const W = 600; const H = 80
  const pts = useMemo(() => {
    const arr = []
    for (let i = 0; i <= months; i++) {
      arr.push({ x: (i / months) * W, y: deposit * Math.pow(1 + rate / 12, i) })
    }
    return arr
  }, [deposit, months, rate])

  const maxY  = pts[pts.length - 1].y
  const minY  = pts[0].y * (rate >= 0 ? 0.995 : 0.98)
  const range = maxY - minY || 1
  const toY   = v => H - 6 - ((v - minY) / range) * (H - 14)

  const d    = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${toY(p.y).toFixed(1)}`).join(' ')
  const area = `${d} L${W},${H} L0,${H} Z`
  const gid  = 'g' + color.replace('#', '')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── 영수증 행
function RRow({ label, value, color, hl }) {
  return (
    <div className={`receipt-row${hl ? ' hl' : ''}`}>
      <span className="r-label">{label}</span>
      <span className="r-val" style={color ? { color } : {}}>{value}</span>
    </div>
  )
}

// ── 토스트
function Toast({ msg }) {
  return msg ? <div className="toast">{msg}</div> : null
}

// ── 메인 앱
export default function App() {
  const [deposit,      setDeposit]      = useState(20_000_000)
  const [months,       setMonths]       = useState(12)
  const [monthlyRent,  setMonthlyRent]  = useState(700_000)
  const [asset,        setAsset]        = useState('sp500')
  const [rates,        setRates]        = useState(FALLBACK_RATES)
  const [stockLoading, setStockLoading] = useState(true)
  const [toast,        setToast]        = useState('')

  // ── 주식 API
  useEffect(() => {
    fetch('/api/stocks')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          const updated = { ...FALLBACK_RATES }
          Object.keys(ASSET_META).forEach(key => {
            const r = data.stocks?.[key]?.rate
            if (typeof r === 'number' && isFinite(r)) updated[key] = r
          })
          setRates(updated)
        }
      })
      .catch(() => {})
      .finally(() => setStockLoading(false))
  }, [])

  // ── URL 파라미터 복원
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const d = p.get('d'), m = p.get('m'), r = p.get('r'), a = p.get('a')
    if (d && isFinite(+d))                   setDeposit(Number(d))
    if (m && MONTH_OPTIONS.includes(+m))     setMonths(Number(m))
    if (r && isFinite(+r))                   setMonthlyRent(Number(r))
    if (a && a in ASSET_META)                setAsset(a)
  }, [])

  const rate       = safeRate(rates[asset], asset)
  const a          = { ...ASSET_META[asset], rate }
  const monthlyFee = Math.round(monthlyRent * 0.1)

  // ── 계산 (항상 실시간)
  const calc = useMemo(() => {
    const opportunity = deposit * rate / 12 * months
    const sunkCost    = monthlyFee * months
    const inflation   = deposit * (1 - Math.pow(1.03, -(months / 12)))
    const total       = opportunity - sunkCost + inflation
    return { opportunity, sunkCost, inflation, total }
  }, [deposit, months, monthlyFee, rate])

  const isPos = calc.total >= 0
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── 공유
  function buildShareUrl() {
    const base = window.location.origin + window.location.pathname
    return `${base}?d=${deposit}&m=${months}&r=${monthlyRent}&a=${asset}`
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }

  async function handleShare() {
    const url  = buildShareUrl()
    const text = `💡 내 보증금 숨은 돈 계산해봤어!\n\n보증금 ${fmt(deposit)} → ${months}개월\n${a.label} 투자 시 순수익 ${isPos ? '+' : ''}${fmt(calc.total)}\n\n나도 계산해봐 👇\n${url}`
    if (navigator.share) {
      try { await navigator.share({ title: '보증금 투자 계산기', text, url }) } catch {}
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      showToast('📋 링크 복사됨!')
    } catch { showToast('링크: ' + url) }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(buildShareUrl())
      showToast('🔗 링크 복사 완료!')
    } catch { showToast('복사 실패') }
  }

  return (
    <div className="app-root">
      <Toast msg={toast} />

      {/* 헤더 */}
      <header className="app-header">
        <div>
          <div className="app-badge">GUARANTEEZ FINTECH</div>
          <div className="app-title">보증금 투자 계산기</div>
        </div>
      </header>

      <div className="scroll-area">
        <div className="calc-wrap">

          {/* ── 카드 1: 보증금 + 월세 + 기간 */}
          <div className="card">
            <div className="deposit-display">
              <div className="dead-badge">🔒 잠긴 돈</div>
              <div className="input-value">{fmt(deposit)}</div>
            </div>

            <div className="slider-group">
              <div className="slider-label">보증금 액수</div>
              <Slider value={deposit} min={1_000_000} max={50_000_000} step={1_000_000}
                onChange={setDeposit} color="var(--neon)" />
              <div className="slider-range">
                <span>100만원</span>
                <span className="center">{fmt(deposit)}</span>
                <span>5,000만원</span>
              </div>
            </div>

            <div className="divider" />

            <div className="slider-group">
              <div className="slider-label">월세</div>
              <Slider value={monthlyRent} min={300_000} max={1_500_000} step={10_000}
                onChange={setMonthlyRent} color="var(--red)" />
              <div className="slider-range">
                <span>30만원</span>
                <span className="center red">{fmt(monthlyRent)}/월</span>
                <span>150만원</span>
              </div>
            </div>

            <div className="divider" />

            <div className="slider-label">거주 예정 기간</div>
            <div className="month-picker">
              {MONTH_OPTIONS.map(m => (
                <button key={m}
                  className={`month-btn${months === m ? ' active' : ''}`}
                  onClick={() => setMonths(m)}>
                  {m}개월
                  <small>{m === 12 ? '1년' : m === 24 ? '2년' : ''}</small>
                </button>
              ))}
            </div>
          </div>

          {/* ── 카드 2: 투자처 선택 */}
          <div className="card">
            <div className="section-title">투자처 선택</div>
            <div className="section-sub">
              {stockLoading ? '실시간 수익률 불러오는 중…' : '1년 실적 기준 실시간 수익률'}
            </div>
            <div className="asset-grid">
              {Object.entries(ASSET_META).map(([key, meta]) => {
                const r      = safeRate(rates[key], key)
                const isOn   = asset === key
                const rColor = r >= 0 ? meta.color : 'var(--red)'
                return (
                  <div key={key}
                    className={`asset-chip${isOn ? ' active' : ''}`}
                    style={isOn ? { borderColor: meta.color, background: `${meta.color}15` } : {}}
                    onClick={() => setAsset(key)}>
                    <span className="asset-icon">{meta.icon}</span>
                    <span className="asset-label" style={isOn ? { color: meta.color } : {}}>{meta.label}</span>
                    <span className="asset-rate" style={{ color: rColor }}>
                      {stockLoading ? '···' : fmtRate(r) + '/yr'}
                    </span>
                    <span className="asset-desc">{meta.desc}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── 카드 3: 라이브 차트 */}
          <div className="card">
            <div className="chart-header">
              <div>
                <div className="section-title">예상 자산 성장</div>
                <div className="section-sub">
                  {months}개월 후 →{' '}
                  <span style={{ color: a.color, fontWeight: 700 }}>
                    {fmt(deposit + calc.opportunity)}
                  </span>
                </div>
              </div>
              <div className="live-badge" style={{ borderColor: a.color }}>
                <div className="live-dot" style={{ background: a.color }} />
                <span className="live-txt" style={{ color: a.color }}>LIVE</span>
              </div>
            </div>
            <div className="chart-area">
              <MiniChart deposit={deposit} months={months} rate={a.rate} color={a.color} />
            </div>
            <div className="chart-footer">
              <div className="chart-legend">
                <div className="legend-dot" style={{ background: 'var(--dead)' }} />
                <span>보증금만 있으면 → {fmt(deposit, true)}</span>
              </div>
              <div className="chart-legend">
                <div className="legend-dot" style={{ background: a.color }} />
                <span>{a.label} 투자 시 → {fmt(deposit + calc.opportunity, true)}</span>
              </div>
            </div>
          </div>

          {/* ── 영수증 (항상 표시) */}
          <div className="receipt">
            <div className="receipt-header">
              <div className="receipt-store">GUARANTEEZ FINANCE</div>
              <div className="receipt-title">보증금 해방 분석서</div>
              <div className="receipt-date">{today}</div>
            </div>

            <hr className="receipt-dash" />

            <RRow label="보증금"                   value={fmt(deposit)} />
            <RRow label="월세"                     value={`${fmt(monthlyRent)}/월`} />
            <RRow label="guaranteez 수수료 (×10%)" value={`${fmt(monthlyFee)}/월`} />
            <RRow label="거주 기간"                value={`${months}개월`} />
            <RRow label="투자처"                   value={`${a.icon} ${a.label} (${fmtRate(rate)}/yr)`} />

            <hr className="receipt-dash" />

            <RRow label="[+] 보증금 해방 자산"              value={fmt(deposit)}                color="var(--neon)"  hl />
            <RRow label={`[+] 예상 투자 수익 (${a.label})`} value={`+${fmt(calc.opportunity)}`} color={a.color}      hl />
            <RRow label="[+] 인플레이션 방어"               value={`+${fmt(calc.inflation)}`}   color="var(--green)" />
            <RRow label="[-] guaranteez 수수료 합계"        value={`-${fmt(calc.sunkCost)}`}    color="var(--red)"   />

            <hr className="receipt-dash" />

            <div className="receipt-total" style={{ background: isPos ? 'var(--green-glow)' : 'var(--red-glow)' }}>
              <div className="rt-lbl">[TOTAL]</div>
              <div className="rt-sub">{isPos ? '당신의 숨은 돈' : '안정성 프리미엄'}</div>
              <div className="rt-amt" style={{ color: isPos ? 'var(--green)' : 'var(--red)' }}>
                {isPos ? '+' : ''}{fmt(calc.total)}
              </div>
            </div>

            <div className="result-msg" style={{ borderColor: isPos ? 'var(--neon-border)' : 'rgba(248,113,113,0.3)' }}>
              <span className="rm-icon">{isPos ? '🚀' : '🛡'}</span>
              <span className="rm-text" style={{ color: isPos ? 'var(--neon)' : 'var(--red)' }}>
                {isPos
                  ? `보증금을 해방해 ${a.label}에 투자하면 ${months}개월 동안 순수익 ${fmt(calc.total)}을 벌 수 있어요.`
                  : `이 경우 전세 유지가 유리합니다. 보증금 안정성 및 전세사기 예방 가치로 해석하세요.`}
              </span>
            </div>

            <hr className="receipt-dash" />

            <div className="receipt-footer">
              <p>* 실시간 주가 기준 1년 수익률 적용 / 실제 수익은 다를 수 있습니다</p>
              <p>* 인플레이션율 연 3% 적용 기준</p>
              <p className="brand">GUARANTEEZ.CO.KR</p>
            </div>
          </div>

          {/* ── 하단 guaranteez CTA */}
          <div className="gz-cta-card">
            <div className="gz-cta-logo">guaranteez</div>
            <a className="gz-cta-btn" href="https://newguaranteez.base44.app/Home"
              target="_blank" rel="noopener noreferrer">
              보증금 0원 만들기 →
            </a>
            <p className="gz-cta-desc">
              월세의 10%만 내고 보증금 없이 입주하세요.<br />
              guaranteez가 보증금 전액을 집주인에게 직접 납부합니다.<br />
              목돈 없이도 원하는 집에 살 수 있는 새로운 방법.
            </p>
          </div>

          {/* ── 공유 버튼 (최하단) */}
          <div className="share-row">
            <button className="share-btn primary" onClick={handleShare}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              결과 공유하기
            </button>
            <button className="share-btn secondary" onClick={handleCopyLink}>
              🔗 링크 복사
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
