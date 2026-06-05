/**
 * Vercel Serverless Function — 글로벌 자산 연간 수익률 조회
 * Yahoo Finance 무료 API / 5분 캐시
 */

const TICKERS = {
  samsung: '005930.KS',
  skhynix: '000660.KS',
  kospi:   '^KS11',
  sp500:   '^GSPC',
  nasdaq:  '^IXIC',
  bitcoin: 'BTC-USD',
}

const FALLBACK = {
  samsung: 0.12,
  skhynix: 0.18,
  kospi:   0.08,
  sp500:   0.105,
  nasdaq:  0.15,
  bitcoin: 0.50,
}

function isValid(v) {
  return typeof v === 'number' && isFinite(v) && v > 0
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'max-age=0, s-maxage=300, stale-while-revalidate=60')

  const results = {}

  await Promise.all(
    Object.entries(TICKERS).map(async ([key, ticker]) => {
      try {
        // v8 먼저 시도, 실패 시 v7 fallback
        const urls = [
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1mo&range=1y`,
          `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1mo&range=1y`,
        ]

        let closes = []

        for (const url of urls) {
          try {
            const r = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json',
              },
            })
            const json = await r.json()
            const raw = json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? []
            closes = raw.filter(isValid)
            if (closes.length >= 2) break
          } catch { /* 다음 URL 시도 */ }
        }

        if (closes.length < 2) throw new Error('데이터 부족')

        const first      = closes[0]
        const last       = closes[closes.length - 1]
        const annualRate = (last - first) / first

        if (!isFinite(annualRate)) throw new Error('수익률 계산 불가')

        results[key] = { rate: annualRate, price: last, ok: true }
      } catch (e) {
        // fallback 수익률 사용
        results[key] = { rate: FALLBACK[key], price: null, ok: false, error: e.message }
      }
    })
  )

  res.json({ ok: true, stocks: results, fetchedAt: new Date().toISOString() })
}
