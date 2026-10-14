import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import TripLeg from "./components/TripLeg";
import type { SearchedTrip } from "../../models/tripModel";
import { formatDate, loadAllTripsSortedBySearchDate } from "./utils/tripOverviewUtils";
import { formatPrice } from "../trips-overview/utils/tripsOverviewUtils";
import "./tripOverview.css";
import PriceHistory from "./components/PriceHistory";

export default function TripOverview() {
    const [searchParams] = useSearchParams();
    const [trips, setTrips] = useState<SearchedTrip[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const origin = searchParams.get("origin") ?? "";
    const returnAirport = searchParams.get("return") ?? "";
    const outbound = searchParams.get("outbound") ?? "";
    const daysParam = searchParams.get("days");
    const days = daysParam === null ? NaN : Number(daysParam);
    const navigate = useNavigate();

    useEffect(() => {
        let cancelled = false;

        async function findTrips() {
            setIsLoading(true);

            try {
                const allTrips = await loadAllTripsSortedBySearchDate();
                const requestedOutbound = outbound.slice(0, 10);

                const matchingTrips = allTrips.filter(({ trip }) => {
                    const tripOutbound = [
                        trip.outbound.getFullYear(),
                        String(trip.outbound.getMonth() + 1).padStart(2, "0"),
                        String(trip.outbound.getDate()).padStart(2, "0"),
                    ].join("-");

                    return (
                        trip.origin === origin &&
                        trip.return === returnAirport &&
                        tripOutbound === requestedOutbound &&
                        trip.days === days
                    );
                });

                if (!cancelled) {
                    setTrips(matchingTrips);
                }
            } catch (error) {
                console.error("Failed to find matching trips:", error);

                if (!cancelled) {
                    setTrips([]);
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        findTrips();

        return () => {
            cancelled = true;
        };
    }, [origin, returnAirport, outbound, days]);

    const latestTrip = trips[0]?.trip;

    return (
        <main className="app details-app">
            <button
                className="back-button"
                onClick={() => {navigate("/overview")}}
                type="button"
            >
                <span aria-hidden="true">←</span> Back to timeline
            </button>

            <header className="details-header">
                <p className="eyebrow">TRIP DETAILS</p>
                <h1>Your flight trip</h1>
                <p className="subtitle">Outbound and return routes for this flight option.</p>
            </header>

            <section className="trip-details-card">
                {isLoading ? (
                    <p>Searching trips...</p>
                ) : !latestTrip ? (
                    <p>
                        No matching trips found. Try returning to the timeline
                        and selecting another flight option.
                    </p>
                ) : (
                    <>
                        <TripLeg
                            label="OUTBOUND FLIGHT"
                            date={latestTrip.outbound}
                            origin={latestTrip.origin}
                            destination={latestTrip.destination}
                        />

                        <TripLeg
                            label="RETURN FLIGHT"
                            date={latestTrip.inbound}
                            origin={latestTrip.destination}
                            destination={latestTrip.return}
                        />

                        <div className="trip-price-panel">
                            <span className="detail-label">TRIP PRICE</span>
                            <strong>{formatPrice(latestTrip.price, latestTrip.currency)}</strong>
                            <span className="price-note">Price shown in the trip data</span>
                        </div>

                        <div className="trip-detail-grid">
                            <div className="detail-item">
                                <span className="detail-label" >OUTBOUND DATE</span>
                                <strong>{formatDate(latestTrip.outbound)}</strong>
                            </div>

                            <div className="detail-item">
                                <span className="detail-label">RETURN DATE</span>
                                <strong>{latestTrip.inbound ? formatDate(latestTrip.inbound) : 'Not provided'}</strong>
                            </div>

                            <div className="detail-item">
                                <span className="detail-label">DURATION</span>
                                <strong>{latestTrip.days || 'Not provided'}</strong>
                            </div>

                            <div className="detail-item">
                                <span className="detail-label">RETURN ROUTE</span>
                                <strong>
                                    {latestTrip.destination || 'Unknown origin'} →{' '}
                                    {latestTrip.origin || 'Unknown destination'}
                                </strong>
                            </div>
                        </div>

                        {latestTrip.url ? (
                            <div className="booking-section">
                                <p>Open the original listing to review the flight or continue to booking.</p>

                                <a
                                    className="booking-button"
                                    href={latestTrip.url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    View flight / booking{' '}<span aria-hidden="true">↗</span>
                                </a>
                            </div>
                        ) : (
                            <div className="booking-section booking-unavailable">
                                No booking link is available for this trip.
                            </div>
                        )}
                    </>
                )}
            </section>

            <PriceHistory 
                trips={trips}
            />
        </main>
    );
}