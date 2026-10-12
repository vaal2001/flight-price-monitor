import { useMemo } from 'react'
import {
  getAvailableSnapshots,
  getOutboundOrigin,
  getOutboundDestination,
  getReturnOrigin,
  getReturnDestination,
  getTripValue,
} from './utils/utils'
import './PriceHistory.css'

const snapshots = import.meta.glob('../../data/*.json', {
  eager: true,
  import: 'default',
})

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeDate(value) {
  const text = String(value ?? '').trim()

  // Preserve date-only strings without timezone conversion.
  const isoDate = text.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoDate) return isoDate[1]

  const parsed = new Date(text)

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return normalizeText(text)
}

function getTripKey(trip) {
  const outboundDate = getTripValue(
    trip,
    'outboundDate',
    'departureDate',
    'date',
  )

  const returnDate = getTripValue(
    trip,
    'returnDate',
    'inboundDate',
    'backDate',
    'back_date',
  )

  const parts = [
    getOutboundOrigin(trip),
    getOutboundDestination(trip),
    normalizeDate(outboundDate),
    getReturnOrigin(trip),
    getReturnDestination(trip),
    normalizeDate(returnDate),
  ]

  // Avoid matching unrelated trips with incomplete identifying data.
  if (
    !parts[0] ||
    !parts[1] ||
    !parts[2] ||
    !parts[3] ||
    !parts[4] ||
    !parts[5]
  ) {
    return null
  }

  return parts.map(normalizeText).join('|')
}

function getObservationDate(snapshot) {
  const value = snapshot.date

  if (value) {
    const parsed = new Date(value)

    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  // Fall back to a YYYY-MM-DD date in the snapshot filename.
  const match = String(snapshot.path ?? '').match(
    /(\d{4}-\d{2}-\d{2})/,
  )

  if (!match) return null

  const parsed = new Date(`${match[1]}T12:00:00Z`)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatMoney(price, currency) {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(price)
  } catch {
    return `${price.toFixed(2)} ${currency}`
  }
}

export default function PriceHistory({ trip }) {
  const history = useMemo(() => {
    const targetKey = getTripKey(trip)

    if (!targetKey) return []

    const availableSnapshots = getAvailableSnapshots(snapshots)

    return availableSnapshots
      .map((snapshot) => {
        const observedTrip = snapshot.trips.find(
          (candidate) => getTripKey(candidate) === targetKey,
        )

        if (!observedTrip) return null

        const date = getObservationDate(snapshot)
        const price = Number(observedTrip.price)

        if (!date || !Number.isFinite(price) || price < 0) {
          return null
        }

        return {
          date,
          price,
          currency: observedTrip.currency || trip.currency || 'EUR',
          path: snapshot.path,
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [trip])

  if (history.length === 0) {
    return (
      <section className="price-history">
        <div className="price-history-heading">
          <div>
            <p className="price-history-eyebrow">PRICE TRACKING</p>
            <h2>Price history</h2>
          </div>
        </div>

        <div className="price-history-empty">
          <span className="price-history-empty-icon" aria-hidden="true">
            ↗
          </span>
          <h3>No historical prices yet</h3>
          <p>
            This trip could not be matched in your saved snapshots.
            Historical data will appear when matching trips are found.
          </p>
        </div>
      </section>
    )
  }

  const currency = history[history.length - 1].currency

  // Avoid comparing observations recorded in different currencies.
  const consistentCurrency = history.every(
    (item) => item.currency === currency,
  )

  const observations = consistentCurrency
    ? history
    : history.filter((item) => item.currency === currency)

  const first = observations[0]
  const latest = observations[observations.length - 1]

  const prices = observations.map((item) => item.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  const change = latest.price - first.price
  const changePercent =
    first.price === 0 ? null : (change / first.price) * 100

  const width = 800
  const height = 300

  const padding = {
    top: 28,
    right: 30,
    bottom: 48,
    left: 82,
  }

  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  // Keep a useful vertical range when every recorded price is identical.
  const spread = maxPrice - minPrice
  const paddingPrice = spread === 0
    ? Math.max(maxPrice * 0.05, 1)
    : spread * 0.12

  const yMin = Math.max(0, minPrice - paddingPrice)
  const yMax = maxPrice + paddingPrice
  const yRange = yMax - yMin || 1

  const firstTime = first.date.getTime()
  const lastTime = latest.date.getTime()
  const timeRange = lastTime - firstTime

  const points = observations.map((item, index) => {
    const x = padding.left + (
      timeRange === 0
        ? plotWidth / 2
        : ((item.date.getTime() - firstTime) / timeRange) * plotWidth
    )

    const y =
      padding.top +
      ((yMax - item.price) / yRange) * plotHeight

    return { ...item, x, y, index }
  })

  const linePath = points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`,
    )
    .join(' ')

  const areaPath = [
    linePath,
    `L ${points[points.length - 1].x} ${padding.top + plotHeight}`,
    `L ${points[0].x} ${padding.top + plotHeight}`,
    'Z',
  ].join(' ')

  const ticks = Array.from({ length: 5 }, (_, index) => (
    yMax - (index / 4) * yRange
  ))

  return (
    <section className="price-history">
      <div className="price-history-heading">
        <div>
          <p className="price-history-eyebrow">PRICE TRACKING</p>
          <h2>Price history</h2>
          <p className="price-history-subtitle">
            Historical prices for this exact trip.
          </p>
        </div>

        <span className="price-history-count">
          {observations.length}{' '}
          {observations.length === 1 ? 'snapshot' : 'snapshots'}
        </span>
      </div>

      <div className="price-history-stats">
        <div className="price-history-stat">
          <span>Latest price</span>
          <strong>{formatMoney(latest.price, currency)}</strong>
          <small>{formatDate(latest.date)}</small>
        </div>

        <div className="price-history-stat">
          <span>Lowest recorded</span>
          <strong>{formatMoney(minPrice, currency)}</strong>
          <small>
            {formatDate(
              observations.find((item) => item.price === minPrice).date,
            )}
          </small>
        </div>

        <div className="price-history-stat">
          <span>Change since first snapshot</span>
          <strong
            className={
              change < 0
                ? 'price-history-down'
                : change > 0
                  ? 'price-history-up'
                  : ''
            }
          >
            {change > 0 ? '+' : ''}
            {formatMoney(change, currency)}
          </strong>
          <small>
            {changePercent === null
              ? 'Percentage unavailable'
              : `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`}
          </small>
        </div>
      </div>

      <div className="price-history-chart">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`Historical price chart with ${observations.length} observations`}
        >
          <defs>
            <linearGradient
              id="price-history-fill"
              x1="0"
              x2="0"
              y1="0"
              y2="1"
            >
              <stop offset="0%" stopColor="#5074ca" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#5074ca" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {ticks.map((tick, index) => {
            const y = padding.top + (index / 4) * plotHeight

            return (
              <g key={index}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="#e9edf4"
                  strokeDasharray="4 5"
                />

                <text
                  x={padding.left - 12}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#788398"
                >
                  {formatMoney(tick, currency)}
                </text>
              </g>
            )
          })}

          <path d={areaPath} fill="url(#price-history-fill)" />

          <path
            d={linePath}
            fill="none"
            stroke="#5074ca"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point) => (
            <g key={`${point.path}-${point.index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="#fff"
                stroke="#5074ca"
                strokeWidth="2.5"
              >
                <title>
                  {formatDate(point.date)}: {formatMoney(point.price, currency)}
                </title>
              </circle>
            </g>
          ))}

          <text
            x={padding.left}
            y={height - 15}
            textAnchor="start"
            fontSize="11"
            fill="#788398"
          >
            {formatDate(first.date)}
          </text>

          {firstTime !== lastTime && (
            <text
              x={width - padding.right}
              y={height - 15}
              textAnchor="end"
              fontSize="11"
              fill="#788398"
            >
              {formatDate(latest.date)}
            </text>
          )}
        </svg>
      </div>

      <p className="price-history-footnote">
        Each point represents a saved snapshot. Missing observations are
        omitted. The line connects the available observations.
      </p>
    </section>
  )
}