/**
 * Vercel Serverless Function — 한국 주식 연간 수익률 조회
 * 삼성전자(005930.KS), SK하이닉스(000660.KS), KOSPI(^KS11)
 * Yahoo Finance 무료 API 사용 / 5분 캐시
 */

const TICKERS = {
  samsung: '005930.KS',
  skhynix: '000660.KS',
  kospi:   '^KS11',
}

const FALLBACK = {
  samsung: 0.12,
  skhynix: 0.18,
  kospi:   0.08,
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'max-age=0, s-maxage=300, stale-while-revalidate=60')

  const results = {}

  await Promise.all(
    Object.entries(TICKERS).map(async ([key, ticker]) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1mo&range=1y`
        const r = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'application/json',
          },
        })
        const json = await r.json()
        const closes = json.chart.result[0].indicators.quote[0].close.filter(v => v != null)

        const first = closes[0]
        const last  = closes[closes.length - 1]
        const annualRate = (last - first) / first

        results[key] = {
          rate:  annualRate,
          price: last,
          ok:    true,
        }
      } catch {
        results[key] = { rate: FALLBACK[key], price: null, ok: false }
      }
    })
  )

  res.json({ ok: true, stocks: results, fetchedAt: new Date().toISOString() })
}
