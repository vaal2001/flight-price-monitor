import { useEffect, useState } from "react";
import { assignLanes, buildMonths, formatPrice, getAllSnapshots, getDate, getHighestPrice, getLowestPrice, getPriceColor, loadTrips } from "./utils/tripsOverviewUtils";
import type { Timeline, Trip } from "../../models/tripModel";
import "./tripsOverview.css";
import { useNavigate } from "react-router";

export default function TripsOverview() {
    const [availableSnapshots] = useState<string[]>(() => getAllSnapshots());
    const [selectedSnapshotName, setSelectedSnapshotName] = useState<string>(availableSnapshots[0] ?? "");
    const [selectedTrips, setSelectedTrips] = useState<Trip[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchOrigin, setSearchOrigin] = useState<string>("");
    const [searchReturn, setSearchReturn] = useState<string>("");
    const [maxPrice, setMaxPrice] = useState<string>("");
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    const [tripLength, setTripLength] = useState<string>("");
    const [invalidDateRange, setInvalidDateRange] = useState<boolean>(false);
    const [minPriceRange, setMinPriceRange] = useState<number>(getLowestPrice(selectedTrips));
    const [maxPriceRange, setMaxPriceRange] = useState<number>(getHighestPrice(selectedTrips));
    const [currency, setCurrency] = useState<string>(selectedTrips[0]?.currency);
    const [months, setMonths] = useState<{ date: Date; label: string }[]>(buildMonths(selectedTrips));
    const [timeline, setTimeline] = useState<Timeline>({
        lanes: [],
        laneCount: 0
    });
    const [allTrips, setAllTrips] = useState<Trip[]>([]);
    const navigate = useNavigate();

    const clearFilters = () => {
        setSearchOrigin("");
        setSearchReturn("");
        setMaxPrice("");
        setStartDate("");
        setEndDate("");
        setTripLength("");
    } 

    const getTotalDaysRange = (months: { date: Date; label: string }[]) => {
        return months.reduce((total, month) => {
            return total + new Date(
                month.date.getFullYear(),
                month.date.getMonth() + 1,
                0
            ).getDate()
        }, 0);
    }

    useEffect(() => {
        if (!selectedSnapshotName) return;

        setIsLoading(true);

        loadTrips(selectedSnapshotName)
        .then(setAllTrips)
        .catch((err) => {
            console.error(err);
            setAllTrips([]);
        })
        .finally(() => setIsLoading(false));
    }, [selectedSnapshotName]);

    useEffect(() => {
        setInvalidDateRange(Boolean(startDate && endDate && startDate > endDate))
    }, [startDate, endDate]);

    useEffect(() => {
        setMinPriceRange(getLowestPrice(selectedTrips));
        setMaxPriceRange(getHighestPrice(selectedTrips));
        setCurrency(selectedTrips[0]?.currency);
        setMonths(buildMonths(selectedTrips));
    }, [selectedTrips]);

    useEffect(() => {
        const lanes = assignLanes(selectedTrips);

        if (!months.length) {
            setTimeline({ lanes: [], laneCount: 0 });
            return;
        }

        const timelineStart = months[0].date;
        const lastMonth = months[months.length - 1].date;

        const timelineEnd = new Date(
            lastMonth.getFullYear(),
            lastMonth.getMonth() + 1,
            1
        );

        const totalDays = (timelineEnd.getTime() - timelineStart.getTime()) / 86400000;

        const positioned = lanes.map((item) => {
            const start = Math.max(
                0,
                (item.dates.start.getTime() - timelineStart.getTime()) / 86400000
            );

            const end = Math.min(
                totalDays,
                (item.dates.end.getTime() - timelineStart.getTime()) / 86400000 + 1
            );

            return {
                ...item,
                left: (start / totalDays) * 100,
                width: Math.max(((end - start) / totalDays) * 100, 0.8),
            };
        });

        setTimeline({
            lanes: positioned,
            laneCount: lanes.reduce(
                (count, item) => Math.max(count, item.lane + 1),
                0
            ),
        });
    }, [selectedTrips, months]);

    useEffect(() => {
        const queryOrigin = searchOrigin.trim().toUpperCase();
        const queryReturn = searchReturn.trim().toUpperCase();
        const limit = maxPrice === '' ? Infinity : Number(maxPrice);
        const days = tripLength === '' ? undefined : Number(tripLength);
        const rangeStart = getDate(startDate);
        const rangeEnd = getDate(endDate);
        
        const filteredTrips = allTrips.filter((trip) => {
            const matchesSearch = 
                (!queryOrigin && queryReturn) ||
                (!queryOrigin && trip.return.includes(queryReturn)) ||
                (trip.origin.includes(queryOrigin) && !queryReturn) ||
                (trip.origin.includes(queryOrigin) && trip.return.includes(queryReturn));

            const matchesPrices = 
                maxPrice === '' ||
                (Number.isFinite(trip.price) && trip.price <= limit);

            const matchesTripLength = 
                tripLength === '' ||
                (Number.isFinite(trip.days) && trip.days === days);

            const matchedDateRange = 
                (!rangeStart && !rangeEnd) ||
                Boolean((!rangeStart || trip.outbound >= rangeStart) && (!rangeEnd || trip.inbound <= rangeEnd))

            return matchesSearch && matchesPrices && matchedDateRange && matchesTripLength;
        });

        setSelectedTrips(filteredTrips);
    }, [allTrips, searchOrigin, searchReturn, maxPrice, startDate, endDate, tripLength])

    return (
        <main className="app">
            <header className="page-header">
                <div>
                    <p className="eyebrow">FLIGHT PLANNER</p>
                    <h1>Trip timeline</h1>
                    <p className="subtitle">Compare your flight options across the calendar.</p>
                </div>

                <div className="snapshot-info">
                    <label className="snapshot-label" htmlFor="snapshot-select">Select snapshot date</label>

                    <select
                        id="snapshot-select"
                        className="snapshot-select"
                        value={selectedSnapshotName}
                        disabled={availableSnapshots.length === 0 || isLoading}
                        onChange={(e) => setSelectedSnapshotName(e.target.value)}
                        style={{
                            maxWidth: "100%",
                            minWidth: "190px",
                            padding: "9px 10px",
                            border: "1px solid #dfe5ef",
                            borderRadius: "8px",
                            background: "#dfe5ef",
                            color: "#354158",
                            font: "inherit",
                            fontSize: "13px",
                        }}
                    >
                        {availableSnapshots.length === 0 ? (
                            <option value="">No snapshots found</option>
                        ) : (
                            availableSnapshots.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))
                        )}
                    </select>

                    <span className="snapshot-label">
                        {isLoading ? "Loading..." : `${allTrips .length} trips in this snapshot`}
                    </span>
                </div>
            </header>

            <section className="filters">
                <label className="filter-field search-field">
                    <span>Search Origin</span>
                    <input 
                        type="search"
                        placeholder="Origin airport"
                        value={searchOrigin}
                        onChange={(event) => setSearchOrigin(event.target.value)}
                    />
                </label>

                <label className="filter-field search-field">
                    <span>Search Return</span>
                    <input 
                        type="search"
                        placeholder="Return airport"
                        value={searchReturn}
                        onChange={(event) => setSearchReturn(event.target.value)}
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

                <label className="filter-field price-field">
                    <span>Trip Days</span>
                    <input 
                        type="number"
                        min="0"
                        placeholder="Trip Days"
                        value={tripLength}
                        onChange={(event) => setTripLength(event.target.value)}
                    />
                </label>

                <label className="filter-field date-field">
                    <span>Travel range - from</span>
                    <input
                        type="date"
                        value={startDate}
                        max={endDate || undefined}
                        onChange={(event) => setStartDate(event.target.value)}
                    />
                </label>

                <label className="filter-field date-field">
                    <span>Travel range - to</span>
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
                    <strong>{invalidDateRange ? 0 : selectedTrips.length}</strong>
                    <span>{selectedTrips.length === 1 ? 'flight option' : 'flight options'}</span>
                </div>

                {selectedTrips.length > 0 && !invalidDateRange && (
                    <span className="range-summary">
                        {formatPrice(minPriceRange, currency)}
                        {' '}-{' '}
                        {formatPrice(maxPriceRange, currency)}
                    </span>
                )}
            </section>

            {selectedTrips.length === 0 || months.length === 0 || invalidDateRange ? (
                <section className="empty-state">
                    <div className="empty-icon">✈</div>
                    <h2>No flights to display</h2>
                    <p>{invalidDateRange ? 'Please correct your selected date range.' : selectedTrips.length === 0 ? 'No trips were found in the selected JSON snapshot.' : 'Try adjusting your route, price, or travel dates.'}</p>
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
                                    ).getDate();

                                    return (
                                        <div
                                            className="month-label"
                                            key={month.label}
                                            style={{ width: `${(daysInMonth / getTotalDaysRange(months)) * 100}%` }}
                                        >
                                            {month.label}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="timeline-body">
                                <div className="month-grid">
                                    {months.map((month) => {
                                        const monthEnd = new Date(
                                            month.date.getFullYear(),
                                            month.date.getMonth() + 1,
                                            1
                                        );

                                        const daysInMonth = (monthEnd.getTime() - month.date.getTime()) / 86400000;

                                        return (
                                            <div
                                                className="month-column"
                                                key={`${month.date.getFullYear()}-${month.label}`}
                                                style={{width: `${(daysInMonth / getTotalDaysRange(months)) * 100}%`}}
                                            />
                                        );
                                    })}
                                </div>

                                <div
                                    className="stacked"
                                    style={{ height: `${Math.max(timeline.laneCount * 22 + 8, 70)}px`, }}
                                >
                                    {timeline.lanes.map((item) => {
                                        const trip = item.trip;
                                        const price = formatPrice(trip.price, trip.currency);
                                        const barColor = getPriceColor(Number(trip.price), minPriceRange, maxPriceRange);

                                        return (
                                            <button
                                                key={`${trip.url}`}
                                                className="stacked-bar"
                                                style={{
                                                    left: `${item.left}%`,
                                                    width: `${item.width}%`,
                                                    top: `${item.lane * 22 + 3}px`,
                                                    backgroundColor: barColor,
                                                }}
                                                title={`${trip.origin} → ${trip.destination} | ${price}`}
                                                aria-label={`${trip.origin} to ${trip.destination}, ${price}`}
                                                onClick={() => {
                                                    const params = new URLSearchParams({
                                                        origin: trip.origin,
                                                        return: trip.return,
                                                        outbound: `${trip.outbound.getFullYear()}-${String(trip.outbound.getMonth() + 1).padStart(2, "0")}-${String(trip.outbound.getDate()).padStart(2, "0")} 00:00:00`,
                                                        days: String(trip.days),
                                                    });

                                                    navigate(`/trip-overview?${params.toString()}`)
                                                }}
                                                type="button"
                                            >
                                                <span className="bar-price" >{price}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}