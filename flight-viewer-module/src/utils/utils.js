export function getAvailableSnapshots(snapshots) {
  const grouped = new Map();

  for (const [path, module] of Object.entries(snapshots)) {
    const filename = path.split("/").pop();

    // Matches YYYY-MM-DD.json and YYYY-MM-DD_config_1.json
    const match = filename.match(
      /^(\d{4}-\d{2}-\d{2})(?:_.*)?\.json$/
    );

    if (!match) continue;

    const snapshotDate = match[1];
    const data = module?.default ?? module;

    if (!grouped.has(snapshotDate)) {
      grouped.set(snapshotDate, {
        date: snapshotDate,
        path: snapshotDate,
        trips: [],
        files: [],
      });
    }

    const snapshot = grouped.get(snapshotDate);

    if (Array.isArray(data?.results)) {
      snapshot.trips.push(...data.results);
    } else if (Array.isArray(data?.trips)) {
      snapshot.trips.push(...data.trips);
    }

    snapshot.files.push(path);
  }

  return Array.from(grouped.values()).sort((a, b) =>
    b.date.localeCompare(a.date)
  );
}

export function getTripValue(trip, ...keys) {
  for (const key of keys) {
    if (trip[key] !== undefined && trip[key] !== null && trip[key] !== '') {
      return trip[key]
    }
  }

  return ''
}

export function getOutboundOrigin(trip) {
  return trip.origin
}

export function getOutboundDestination(trip) {
  return trip.destination
}

export function getReturnOrigin(trip) {
  return trip.destination
}

export function getReturnDestination(trip) {
  return trip.originReturn || trip.origin
}

export function getDate(value) {
  if (!value) return null

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function getTripDates(trip) {
  const start = getDate(
    getTripValue(trip, 'outboundDate', 'departureDate', 'date')
  )
  const returnDate = getDate(
    getTripValue(trip, 'returnDate', 'inboundDate', 'backDate', 'back_date')
  )

  if (!start) return null

  return {
    start,
    end: returnDate && returnDate >= start ? returnDate : start,
  }
}

export function formatPrice(trip) {
  const price = Number(trip.price)

  if (!Number.isFinite(price)) return 'Price unavailable'

  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: trip.currency || 'EUR',
      maximumFractionDigits: 0,
    }).format(price)
  } catch {
    return `${trip.currency || 'EUR'} ${Math.round(price)}`
  }
}

export function formatDate(value) {
  const date = getDate(value)
  if (!date) return value || 'Not provided'

  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function getDuration(trip) {
  const supplied = getTripValue(
    trip,
    'duration',
    'tripDuration',
    'nights'
  )

  if (supplied !== '') {
    return typeof supplied === 'number'
      ? `${supplied} days/nights`
      : String(supplied)
  }

  const dates = getTripDates(trip)
  if (!dates) return ''

  const days = Math.round(
    (dates.end.getTime() - dates.start.getTime()) / 86400000
  )

  return `${days} ${days === 1 ? 'night' : 'nights'}`
}

export function getPriceColor(price, minPrice, maxPrice) {
  if (!Number.isFinite(price)) return '#8b95a5'

  const ratio =
    maxPrice === minPrice
      ? 0.5
      : Math.max(0, Math.min(1, (price - minPrice) / (maxPrice - minPrice)))

  const stops = [
    { position: 0, color: [22, 163, 74] },
    { position: 0.5, color: [234, 179, 8] },
    { position: 1, color: [220, 38, 38] },
  ]

  const lower = ratio <= 0.5 ? stops[0] : stops[1]
  const upper = ratio <= 0.5 ? stops[1] : stops[2]
  const localRatio =
    (ratio - lower.position) / (upper.position - lower.position)

  const rgb = lower.color.map((channel, index) =>
    Math.round(
      channel + (upper.color[index] - channel) * localRatio
    )
  )

  return `rgb(${rgb.join(', ')})`
}

export function getTripTooltip(trip) {
  const outboundOrigin = getOutboundOrigin(trip) || 'Unknown origin'
  const outboundDestination =
    getOutboundDestination(trip) || 'Unknown destination'
  const returnOrigin = getReturnOrigin(trip) || 'Unknown return origin'
  const returnDestination =
    getReturnDestination(trip) || 'Unknown return destination'

  const outboundDate = getTripValue(
    trip,
    'outboundDate',
    'departureDate',
    'date'
  )
  const returnDate = getTripValue(
    trip,
    'returnDate',
    'inboundDate',
    'backDate',
    'back_date'
  )

  return [
    formatPrice(trip),
    `Outbound: ${outboundOrigin} → ${outboundDestination}`,
    `Departure: ${formatDate(outboundDate)}`,
    `Return: ${returnOrigin} → ${returnDestination}`,
    `Return date: ${returnDate ? formatDate(returnDate) : 'Not provided'}`,
    'Click to view full trip details',
  ].join('\n')
}

export function readTripIdFromHash() {
  const match = window.location.hash.match(/^#trip=(.+)$/)
  return match ? decodeURIComponent(match[1]) : null
}

export function buildMonths(trips) {
  const dates = trips
    .map(getTripDates)
    .filter(Boolean)
    .flatMap(({ start, end }) => [start, end])
    .sort((a, b) => a - b)

  if (!dates.length) return []

  const first = new Date(dates[0].getFullYear(), dates[0].getMonth(), 1)
  const last = new Date(
    dates[dates.length - 1].getFullYear(),
    dates[dates.length - 1].getMonth(),
    1
  )

  const months = []
  const cursor = new Date(first)

  while (cursor <= last) {
    months.push({
      date: new Date(cursor),
      label: cursor.toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric',
      }),
    })

    cursor.setMonth(cursor.getMonth() + 1)
  }

  return months
}

export function assignLanes(trips) {
  const sorted = trips
    .map((trip) => ({
      trip,
      dates: getTripDates(trip),
    }))
    .filter((item) => item.dates)
    .sort(
      (a, b) =>
        a.dates.start - b.dates.start ||
        a.dates.end - b.dates.end
    )

  const laneEnds = []

  return sorted.map((item) => {
    let lane = laneEnds.findIndex(
      (end) => end < item.dates.start.getTime()
    )

    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.dates.end.getTime())
    } else {
      laneEnds[lane] = item.dates.end.getTime()
    }

    return { ...item, lane }
  })
}