import { useState, useMemo } from 'react'

// ── 투자처 (저축 상품 제외 — 투자 자산만)
const ASSETS = {
  sp500:   { label: 'S&P 500',  icon: '📈', rate: 0.105, rateLabel: '연 10.5%', desc: '미국 대형주 평균',  color: '#34D399' },
  nasdaq:  { label: '나스닥',   icon: '⚡', rate: 0.150, rateLabel: '연 15%',   desc: '기술주 중심',      color: '#38BDF8' },
  bitcoin: { label: '비트코인', icon: '₿',  rate: 0.500, rateLabel: '~연 50%',  desc: '고위험 고수익',    color: '#F59E0B' },
}

const MONTH_OPTIONS = [6, 12, 18, 24]

// ── 숫자 포맷
function fmt(n, short = false) {
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
  const minY  = deposit * 0.995
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

// ── 메인 앱
export default function App() {
  const [deposit,    setDeposit]    = useState(20_000_000)   // 2000만원
  const [months,     setMonths]     = useState(12)
  const [monthlyRent, setMonthlyRent] = useState(700_000)    // 월세 70만원
  const [asset,      setAsset]      = useState('sp500')
  const [viewMode,   setViewMode]   = useState('full')
  const [showResult, setShowResult] = useState(false)

  const a = ASSETS[asset]

  // 개런티즈 수수료 = 월세 × 10%
  const monthlyFee = Math.round(monthlyRent * 0.1)

  const calc = useMemo(() => {
    const opportunity = deposit * a.rate / 12 * months
    const sunkCost    = monthlyFee * months
    const inflation   = deposit * (1 - Math.pow(1.03, -(months / 12)))
    const total       = opportunity - sunkCost + inflation
    return { opportunity, sunkCost, inflation, total }
  }, [deposit, months, monthlyFee, a.rate])

  const isPos = calc.total >= 0
  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  function reset() { setShowResult(false) }

  return (
    <div>
      {/* 헤더 */}
      <header className="app-header">
        <div>
          <div className="app-badge">GUARANTEES FINTECH</div>
          <div className="app-title">보증금 투자 계산기</div>
        </div>
        <div className="mode-toggle">
          <button className={`mode-btn${viewMode === 'full' ? ' active' : ''}`} onClick={() => setViewMode('full')}>📱 전체</button>
          <button className={`mode-btn${viewMode === 'popup' ? ' active' : ''}`} onClick={() => setViewMode('popup')}>🖥 팝업</button>
        </div>
      </header>

      {/* 본문 */}
      <div className="scroll-area">
        <div className={`calc-wrap ${viewMode}`}>

          {/* ── 카드 1: 보증금 + 월세 + 기간 */}
          <div className="card">
            {/* 보증금 */}
            <div className="deposit-display">
              <div className="dead-badge">🔒 잠긴 돈</div>
              <div className="input-value">{fmt(deposit)}</div>
            </div>
            <div className="slider-group">
              <div className="slider-label">보증금 액수</div>
              <Slider
                value={deposit} min={1_000_000} max={50_000_000} step={1_000_000}
                onChange={v => { setDeposit(v); reset() }}
                color="var(--neon)"
              />
              <div className="slider-range">
                <span>100만원</span>
                <span className="center">{fmt(deposit)}</span>
                <span>5,000만원</span>
              </div>
            </div>

            <div className="divider" />

            {/* 월세 → 수수료 자동 계산 */}
            <div className="slider-group">
              <div className="slider-label">월세</div>
              <Slider
                value={monthlyRent} min={300_000} max={1_500_000} step={10_000}
                onChange={v => { setMonthlyRent(v); reset() }}
                color="var(--red)"
              />
              <div className="slider-range">
                <span>30만원</span>
                <span className="center red">{fmt(monthlyRent)}/월</span>
                <span>150만원</span>
              </div>
            </div>

            <div className="divider" />

            {/* 거주 기간 */}
            <div className="slider-label">거주 예정 기간</div>
            <div className="month-picker">
              {MONTH_OPTIONS.map(m => (
                <button
                  key={m}
                  className={`month-btn${months === m ? ' active' : ''}`}
                  onClick={() => { setMonths(m); reset() }}
                >
                  {m}개월
                  <small>{m === 12 ? '1년' : m === 24 ? '2년' : ''}</small>
                </button>
              ))}
            </div>
          </div>

          {/* ── 카드 2: 투자처 선택 */}
          <div className="card">
            <div className="section-title">투자처 선택</div>
            <div className="section-sub">보증금을 해방하면 어디에 투자하시겠어요?</div>
            <div className="asset-grid">
              {Object.entries(ASSETS).map(([key, info]) => (
                <div
                  key={key}
                  className={`asset-chip${asset === key ? ' active' : ''}`}
                  style={asset === key ? { borderColor: info.color, background: `${info.color}15` } : {}}
                  onClick={() => { setAsset(key); reset() }}
                >
                  <span className="asset-icon">{info.icon}</span>
                  <span className="asset-label" style={asset === key ? { color: info.color } : {}}>{info.label}</span>
                  <span className="asset-rate" style={{ color: info.color }}>{info.rateLabel}</span>
                  <span className="asset-desc">{info.desc}</span>
                </div>
              ))}
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

          {/* ── CTA */}
          <button
            className="calc-btn"
            style={{
              background:  isPos ? 'var(--neon)' : 'var(--red)',
              boxShadow:   isPos ? '0 4px 20px rgba(56,189,248,0.35)' : '0 4px 20px rgba(248,113,113,0.3)',
            }}
            onClick={() => setShowResult(true)}
          >
            💡 숨은 돈 계산하기
          </button>

          {/* ── 영수증 */}
          {showResult && (
            <div className="receipt">
              <div className="receipt-header">
                <div className="receipt-store">GUARANTEES FINANCE</div>
                <div className="receipt-title">보증금 해방 분석서</div>
                <div className="receipt-date">{today}</div>
              </div>

              <hr className="receipt-dash" />

              <RRow label="보증금"               value={fmt(deposit)} />
              <RRow label="월세"                 value={`${fmt(monthlyRent)}/월`} />
              <RRow label="개런티즈 수수료 (×10%)" value={`${fmt(monthlyFee)}/월`} />
              <RRow label="거주 기간"             value={`${months}개월`} />
              <RRow label="투자처"               value={`${a.icon} ${a.label} (${a.rateLabel})`} />

              <hr className="receipt-dash" />

              <RRow label="[+] 보증금 해방 자산"              value={fmt(deposit)}                color="var(--neon)"  hl />
              <RRow label={`[+] 예상 투자 수익 (${a.label})`} value={`+${fmt(calc.opportunity)}`} color={a.color}      hl />
              <RRow label="[+] 인플레이션 방어"               value={`+${fmt(calc.inflation)}`}   color="var(--green)" />
              <RRow label="[-] 개런티즈 수수료 합계"           value={`-${fmt(calc.sunkCost)}`}    color="var(--red)"   />

              <hr className="receipt-dash" />

              <div
                className="receipt-total"
                style={{ background: isPos ? 'var(--green-glow)' : 'var(--red-glow)' }}
              >
                <div className="rt-lbl">[TOTAL]</div>
                <div className="rt-sub">{isPos ? '당신의 숨은 돈' : '안정성 프리미엄'}</div>
                <div className="rt-amt" style={{ color: isPos ? 'var(--green)' : 'var(--red)' }}>
                  {isPos ? '+' : ''}{fmt(calc.total)}
                </div>
              </div>

              <div
                className="result-msg"
                style={{ borderColor: isPos ? 'var(--neon-border)' : 'rgba(248,113,113,0.3)' }}
              >
                <span className="rm-icon">{isPos ? '🚀' : '🛡'}</span>
                <span className="rm-text" style={{ color: isPos ? 'var(--neon)' : 'var(--red)' }}>
                  {isPos
                    ? `보증금을 해방해 ${a.label}에 투자하면 ${months}개월 동안 순수익 ${fmt(calc.total)}을 벌 수 있어요.`
                    : `이 경우 전세 유지가 유리합니다. 보증금 안정성 및 전세사기 예방 가치로 해석하세요.`}
                </span>
              </div>

              <hr className="receipt-dash" />

              <div className="receipt-footer">
                <p>* 실제 수익은 시장 상황에 따라 다를 수 있습니다</p>
                <p>* 인플레이션율 연 3% 적용 기준</p>
                <p className="brand">GUARANTEES.CO.KR</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
