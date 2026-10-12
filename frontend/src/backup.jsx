
import { useEffect, useMemo, useState } from 'react'
import './index.css'
import { assignLanes, buildMonths, formatDate, formatPrice, getAvailableSnapshots, getDate, getDuration, getOutboundDestination, getOutboundOrigin, getPriceColor, getReturnDestination, getReturnOrigin, getTripDates, getTripTooltip, getTripValue, readTripIdFromHash } from './utils/utils'

const snapshots = import.meta.glob('../../data/*.json', {
  eager: true,
  import: 'default',
});

function TripLeg({ label, origin, destination, date }) {
  return (
    <section className="trip-leg">
      <div className="trip-leg-heading">
        <span className="detail-label">{label}</span>
        <span className="trip-leg-date">{formatDate(date)}</span>
      </div>

      <div className="trip-route">
        <div className="airport">
          <span className="detail-label">FROM</span>
          <h2>{origin || 'Unknown origin'}</h2>
        </div>

        <div className="route-connector" aria-hidden="true">
          <span>✈</span>
        </div>

        <div className="airport airport-destination">
          <span className="detail-label">TO</span>
          <h2>{destination || 'Unknown destination'}</h2>
        </div>
      </div>
    </section>
  )
}

function TripDetails({ trip, onBack }) {
  const outboundOrigin = getOutboundOrigin(trip)
  const outboundDestination = getOutboundDestination(trip)
  const returnOrigin = getReturnOrigin(trip)
  const returnDestination = getReturnDestination(trip)

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

  const url = getTripValue(trip, 'url', 'link', 'bookingUrl')
  const duration = getDuration(trip)

  return (
    <main className="app details-app">
      <button className="back-button" onClick={onBack} type="button">
        <span aria-hidden="true">←</span> Back to timeline
      </button>

      <header className="details-header">
        <p className="eyebrow">TRIP DETAILS</p>
        <h1>Your flight trip</h1>
        <p className="subtitle">
          Outbound and return routes for this flight option.
        </p>
      </header>

      <section className="trip-details-card">
        <TripLeg
          label="OUTBOUND FLIGHT"
          origin={outboundOrigin}
          destination={outboundDestination}
          date={outboundDate}
        />

        <TripLeg
          label="RETURN FLIGHT"
          origin={returnOrigin}
          destination={returnDestination}
          date={returnDate}
        />

        <div className="trip-price-panel">
          <span className="detail-label">TRIP PRICE</span>
          <strong>{formatPrice(trip)}</strong>
          <span className="price-note">Price shown in the trip data</span>
        </div>

        <div className="trip-detail-grid">
          <div className="detail-item">
            <span className="detail-label">OUTBOUND DATE</span>
            <strong>{formatDate(outboundDate)}</strong>
          </div>

          <div className="detail-item">
            <span className="detail-label">RETURN DATE</span>
            <strong>
              {returnDate ? formatDate(returnDate) : 'Not provided'}
            </strong>
          </div>

          <div className="detail-item">
            <span className="detail-label">DURATION</span>
            <strong>{duration || 'Not provided'}</strong>
          </div>

          <div className="detail-item">
            <span className="detail-label">RETURN ROUTE</span>
            <strong>
              {returnOrigin || 'Unknown origin'} →{' '}
              {returnDestination || 'Unknown destination'}
            </strong>
          </div>
        </div>

        {url ? (
          <div className="booking-section">
            <p>
              Open the original listing to review the flight or continue to
              booking.
            </p>
            <a
              className="booking-button"
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              View flight / booking <span aria-hidden="true">↗</span>
            </a>
          </div>
        ) : (
          <div className="booking-section booking-unavailable">
            No booking link is available for this trip.
          </div>
        )}
      </section>
    </main>
  )
}

function App() {
  const availableSnapshots = useMemo(() => getAvailableSnapshots(snapshots), [])

  const [selectedSnapshotPath, setSelectedSnapshotPath] = useState('')

  const snapshot =
    availableSnapshots.find((item) => item.path === selectedSnapshotPath) ??
    availableSnapshots[0] ??
    { path: '', date: '', trips: [] }

  const [search, setSearch] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedTripId, setSelectedTripId] = useState(() =>
    readTripIdFromHash()
  )

  useEffect(() => {
    const syncFromHash = () => {
      setSelectedTripId(readTripIdFromHash())
    }

    window.addEventListener('hashchange', syncFromHash)
    window.addEventListener('popstate', syncFromHash)

    return () => {
      window.removeEventListener('hashchange', syncFromHash)
      window.removeEventListener('popstate', syncFromHash)
    }
  }, [])

  const allTrips = useMemo(
    () =>
      snapshot.trips.map((trip, index) => ({
        ...trip,
        _tripId: String(index),
      })),
    [snapshot]
  )

  const selectedTrip = allTrips.find(
    (trip) => trip._tripId === selectedTripId
  )

  const invalidDateRange = Boolean(
    startDate && endDate && startDate > endDate
  )

  const trips = useMemo(() => {
    const query = search.trim().toLowerCase()
    const limit = maxPrice === '' ? Infinity : Number(maxPrice)
    const rangeStart = getDate(startDate)
    const rangeEnd = getDate(endDate)

    return allTrips.filter((trip) => {
      const origin = String(getOutboundOrigin(trip)).toLowerCase()
      const destination = String(getOutboundDestination(trip)).toLowerCase()
      const returnOrigin = String(getReturnOrigin(trip)).toLowerCase()
      const returnDestination = String(getReturnDestination(trip)).toLowerCase()

      const matchesSearch =
        !query ||
        origin.includes(query) ||
        destination.includes(query) ||
        returnOrigin.includes(query) ||
        returnDestination.includes(query)

      const price = Number(trip.price)
      const matchesPrice =
        maxPrice === '' ||
        (Number.isFinite(price) && price <= limit)

      const dates = getTripDates(trip)

      const matchesDateRange =
        (!rangeStart && !rangeEnd) ||
        Boolean(
          dates &&
            (!rangeStart || dates.start >= rangeStart) &&
            (!rangeEnd || dates.end <= rangeEnd)
        )

      return matchesSearch && matchesPrice && matchesDateRange
    })
  }, [allTrips, search, maxPrice, startDate, endDate])

  const priceRange = useMemo(() => {
    const prices = trips
      .map((trip) => Number(trip.price))
      .filter(Number.isFinite)

    if (!prices.length) return { min: 0, max: 0 }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    }
  }, [trips])

  const months = useMemo(() => buildMonths(trips), [trips])

  const timeline = useMemo(() => {
    const lanes = assignLanes(trips)

    if (!months.length) {
      return { lanes: [], laneCount: 0 }
    }

    const timelineStart = months[0].date
    const lastMonth = months[months.length - 1].date
    const timelineEnd = new Date(
      lastMonth.getFullYear(),
      lastMonth.getMonth() + 1,
      1
    )
    const totalDays = (timelineEnd - timelineStart) / 86400000

    const positioned = lanes.map((item) => {
      const start = Math.max(
        0,
        (item.dates.start - timelineStart) / 86400000
      )

      const end = Math.min(
        totalDays,
        (item.dates.end - timelineStart) / 86400000 + 1
      )

      return {
        ...item,
        left: (start / totalDays) * 100,
        width: Math.max(((end - start) / totalDays) * 100, 0.8),
      }
    })

    return {
      lanes: positioned,
      laneCount: lanes.reduce(
        (count, item) => Math.max(count, item.lane + 1),
        0
      ),
    }
  }, [trips, months])

  const totalDays = months.length
    ? (
        new Date(
          months[months.length - 1].date.getFullYear(),
          months[months.length - 1].date.getMonth() + 1,
          1
        ) - months[0].date
      ) / 86400000
    : 0

  const clearFilters = () => {
    setSearch('')
    setMaxPrice('')
    setStartDate('')
    setEndDate('')
  }

  const openTrip = (trip) => {
    window.location.hash = `trip=${encodeURIComponent(trip._tripId)}`
  }

  const backToTimeline = () => {
    window.location.hash = 'timeline'
    setSelectedTripId(null)
  }

  if (selectedTrip) {
    return <TripDetails trip={selectedTrip} onBack={backToTimeline} />
  }

  return (
    <main className="app">
      <header className="page-header">
        <div>
          <p className="eyebrow">FLIGHT PLANNER</p>
          <h1>Trip timeline</h1>
          <p className="subtitle">
            Compare your flight options across the calendar.
          </p>
        </div>

        <div className="snapshot-info">
          <label className="snapshot-label" htmlFor="snapshot-select">
            Select snapshot date
          </label>

          <select
            id="snapshot-select"
            className="snapshot-select"
            value={snapshot.path}
            disabled={availableSnapshots.length === 0}
            onChange={(event) => setSelectedSnapshotPath(event.target.value)}
            style={{
              maxWidth: '100%',
              minWidth: '190px',
              padding: '9px 10px',
              border: '1px solid #dfe5ef',
              borderRadius: '8px',
              background: '#fbfcfe',
              color: '#354158',
              font: 'inherit',
              fontSize: '13px',
            }}
          >
            {availableSnapshots.length === 0 ? (
              <option value="">No snapshots found</option>
            ) : (
              availableSnapshots.map((item) => (
                <option key={item.path} value={item.path}>
                  {item.date}
                </option>
              ))
            )}
          </select>

          <span className="snapshot-label">
            {snapshot.trips.length} trips in this snapshot
          </span>
        </div>
      </header>

      <section className="filters">
        <label className="filter-field search-field">
          <span>Search route</span>
          <input
            type="search"
            placeholder="Origin or destination"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="filter-field price-field">
          <span>Maximum price</span>
          <input
            type="number"
            min="0"
            placeholder="Any price"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
          />
        </label>

        <label className="filter-field date-field">
          <span>Travel range — from</span>
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>

        <label className="filter-field date-field">
          <span>Travel range — to</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>

        <button
          className="clear-button"
          onClick={clearFilters}
          type="button"
        >
          Clear filters
        </button>

        <div className="price-legend">
          <span>Cheaper</span>
          <div className="price-gradient" />
          <span>More expensive</span>
        </div>
      </section>

      {invalidDateRange && (
        <p className="filter-error">
          The end date must be on or after the start date.
        </p>
      )}

      <section className="results-summary">
        <div>
          <strong>{invalidDateRange ? 0 : trips.length}</strong>
          <span>
            {trips.length === 1 ? 'flight option' : 'flight options'}
          </span>
        </div>

        {trips.length > 0 && !invalidDateRange && (
          <span className="range-summary">
            {formatPrice({
              price: priceRange.min,
              currency: trips[0]?.currency || 'EUR',
            })}{' '}
            –{' '}
            {formatPrice({
              price: priceRange.max,
              currency: trips[0]?.currency || 'EUR',
            })}
          </span>
        )}
      </section>

      {trips.length === 0 || months.length === 0 || invalidDateRange ? (
        <section className="empty-state">
          <div className="empty-icon">✈</div>
          <h2>No flights to display</h2>
          <p>
            {invalidDateRange
              ? 'Please correct your selected date range.'
              : snapshot.trips.length === 0
                ? 'No trips were found in the selected JSON snapshot.'
                : 'Try adjusting your route, price, or travel dates.'}
          </p>
          <button
            className="clear-button"
            onClick={clearFilters}
            type="button"
          >
            Reset filters
          </button>
        </section>
      ) : (
        <section className="timeline-card">
          <div className="timeline-scroll">
            <div className="timeline">
              <div className="month-header">
                {months.map((month) => {
                  const daysInMonth = new Date(
                    month.date.getFullYear(),
                    month.date.getMonth() + 1,
                    0
                  ).getDate()

                  return (
                    <div
                      className="month-label"
                      key={month.label}
                      style={{
                        width: `${(daysInMonth / totalDays) * 100}%`,
                      }}
                    >
                      {month.label}
                    </div>
                  )
                })}
              </div>

              <div className="timeline-body">
                <div className="month-grid">
                  {months.map((month) => {
                    const monthEnd = new Date(
                      month.date.getFullYear(),
                      month.date.getMonth() + 1,
                      1
                    )

                    return (
                      <div
                        className="month-column"
                        key={month.label}
                        style={{
                          width: `${
                            ((monthEnd - month.date) / 86400000 / totalDays) *
                            100
                          }%`,
                        }}
                      />
                    )
                  })}
                </div>

                <div
                  className="stacked"
                  style={{
                    height: `${Math.max(timeline.laneCount * 22 + 8, 70)}px`,
                  }}
                >
                  {timeline.lanes.map((item) => {
                    const trip = item.trip
                    const price = formatPrice(trip)
                    const barColor = getPriceColor(
                      Number(trip.price),
                      priceRange.min,
                      priceRange.max
                    )

                    return (
                      <button
                        key={trip._tripId}
                        className="stacked-bar"
                        style={{
                          left: `${item.left}%`,
                          width: `${item.width}%`,
                          top: `${item.lane * 22 + 3}px`,
                          backgroundColor: barColor,
                        }}
                        title={getTripTooltip(trip)}
                        aria-label={getTripTooltip(trip)}
                        onClick={() => openTrip(trip)}
                        type="button"
                      >
                        <span className="bar-price">{price}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <footer className="timeline-footer">
            <span>Each bar represents a trip date range.</span>
            <span>Hover over a price for both routes; click for full details.</span>
          </footer>
        </section>
      )}
    </main>
  )
}

export default App
