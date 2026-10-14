import type { SearchedTrip } from "../../../models/tripModel";
import { formatPrice } from "../../trips-overview/utils/tripsOverviewUtils";
import { formatDate } from "../utils/tripOverviewUtils";
import "./priceHistory.css";

export default function PriceHistory({
    trips,
}: {
    trips: SearchedTrip[];
}) {
    const history = [...trips].sort(
        (a, b) =>
            new Date(a.searchDate).getTime() -
            new Date(b.searchDate).getTime()
    );

    const first = history[0];
    const latest = history[history.length - 1];

    const prices = history.map(item => item.trip.price);
    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;

    const cheapestTrip =
        minPrice === null
            ? undefined
            : history.find(item => item.trip.price === minPrice);

    const currency = latest?.trip.currency ?? "EUR";

    const change =
        history.length >= 2
            ? latest.trip.price - first.trip.price
            : null;

    const changePercent =
        change === null || first.trip.price === 0
            ? null
            : (change / first.trip.price) * 100;

    // SVG chart dimensions
    const width = 800;
    const height = 300;
    const padding = { top: 25, right: 30, bottom: 45, left: 85 };

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const priceSpread =
        minPrice === null || maxPrice === null
            ? 0
            : maxPrice - minPrice;

    const pricePadding =
        priceSpread === 0
            ? Math.max((maxPrice ?? 0) * 0.05, 1)
            : priceSpread * 0.12;

    const yMin = Math.max(0, (minPrice ?? 0) - pricePadding);
    const yMax = (maxPrice ?? 0) + pricePadding;
    const yRange = yMax - yMin || 1;

    const firstTime = first
        ? new Date(first.searchDate).getTime()
        : 0;

    const lastTime = latest
        ? new Date(latest.searchDate).getTime()
        : 0;

    const timeRange = lastTime - firstTime;

    const points = history.map((item, index) => {
        const time = new Date(item.searchDate).getTime();

        const x =
            padding.left +
            (timeRange === 0
                ? history.length === 1
                    ? plotWidth / 2
                    : (index / (history.length - 1)) * plotWidth
                : ((time - firstTime) / timeRange) * plotWidth);

        const y =
            padding.top +
            ((yMax - item.trip.price) / yRange) * plotHeight;

        return { x, y, item, index };
    });

    const linePath = points
        .map(
            (point, index) =>
                `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
        )
        .join(" ");

    const areaPath =
        points.length > 0
            ? `${linePath} L ${points[points.length - 1].x} ${
                  padding.top + plotHeight
              } L ${points[0].x} ${padding.top + plotHeight} Z`
            : "";

    const ticks = Array.from(
        { length: 5 },
        (_, index) => yMax - (index / 4) * yRange
    );

    return (
        <section className="price-history">
            <div className="price-history-heading">
                <div>
                    <p className="price-history-eyebrow">PRICE TRACKING</p>
                    <h2>Price History</h2>
                    <p className="price-history-subtitle">
                        Historical prices for this exact trip.
                    </p>
                </div>

                <span className="price-history-count">
                    {history.length}{" "}
                    {history.length === 1 ? "snapshot" : "snapshots"}
                </span>
            </div>

            {history.length === 0 ? (
                <div className="price-history-empty">
                    <h3>No historical prices yet</h3>
                    <p>No saved price records were found for this trip.</p>
                </div>
            ) : (
                <>
                    <div className="price-history-stats">
                        <div className="price-history-stat">
                            <span>Latest price</span>
                            <strong>
                                {formatPrice(latest.trip.price, currency)}
                            </strong>
                            <small>{formatDate(latest.searchDate)}</small>
                        </div>

                        <div className="price-history-stat">
                            <span>Lowest recorded</span>
                            <strong>
                                {formatPrice(minPrice!, currency)}
                            </strong>
                            <small>
                                {cheapestTrip
                                    ? formatDate(cheapestTrip.searchDate)
                                    : "No records"}
                            </small>
                        </div>

                        <div className="price-history-stat">
                            <span>Change since first snapshot</span>
                            <strong
                                className={
                                    change === null
                                        ? ""
                                        : change < 0
                                          ? "price-history-down"
                                          : change > 0
                                            ? "price-history-up"
                                            : ""
                                }
                            >
                                {change === null
                                    ? "Not available"
                                    : `${change > 0 ? "+" : ""}${formatPrice(
                                          change,
                                          currency
                                      )}`}
                            </strong>
                            <small>
                                {changePercent === null
                                    ? "Percentage unavailable"
                                    : `${changePercent > 0 ? "+" : ""}${changePercent.toFixed(1)}%`}
                            </small>
                        </div>
                    </div>

                    <div className="price-history-chart">
                        <svg
                            viewBox={`0 0 ${width} ${height}`}
                            role="img"
                            aria-label="Flight price progression over time"
                        >
                            <defs>
                                <linearGradient
                                    id="price-history-fill"
                                    x1="0"
                                    x2="0"
                                    y1="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="0%"
                                        stopColor="#5074ca"
                                        stopOpacity="0.18"
                                    />
                                    <stop
                                        offset="100%"
                                        stopColor="#5074ca"
                                        stopOpacity="0.01"
                                    />
                                </linearGradient>
                            </defs>

                            {ticks.map((tick, index) => {
                                const y =
                                    padding.top +
                                    (index / 4) * plotHeight;

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
                                            x={padding.left - 10}
                                            y={y + 4}
                                            textAnchor="end"
                                            fontSize="11"
                                            fill="#788398"
                                        >
                                            {formatPrice(tick, currency)}
                                        </text>
                                    </g>
                                );
                            })}

                            {points.length > 1 && (
                                <path
                                    d={areaPath}
                                    fill="url(#price-history-fill)"
                                />
                            )}

                            {points.length > 1 && (
                                <path
                                    d={linePath}
                                    fill="none"
                                    stroke="#5074ca"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}

                            {points.map(point => (
                                <g
                                    key={`${point.index}-${new Date(
                                        point.item.searchDate
                                    ).getTime()}`}
                                >
                                    <circle
                                        cx={point.x}
                                        cy={point.y}
                                        r="5"
                                        fill="#fff"
                                        stroke="#5074ca"
                                        strokeWidth="2.5"
                                    >
                                        <title>
                                            {formatDate(point.item.searchDate)}
                                            {": "}
                                            {formatPrice(
                                                point.item.trip.price,
                                                currency
                                            )}
                                        </title>
                                    </circle>
                                </g>
                            ))}

                            <text
                                x={padding.left}
                                y={height - 12}
                                textAnchor="start"
                                fontSize="11"
                                fill="#788398"
                            >
                                {formatDate(first.searchDate)}
                            </text>

                            {timeRange > 0 && (
                                <text
                                    x={width - padding.right}
                                    y={height - 12}
                                    textAnchor="end"
                                    fontSize="11"
                                    fill="#788398"
                                >
                                    {formatDate(latest.searchDate)}
                                </text>
                            )}
                        </svg>
                    </div>

                    <p className="price-history-footnote">
                        Each point represents a saved price snapshot.
                    </p>
                </>
            )}
        </section>
    );
}