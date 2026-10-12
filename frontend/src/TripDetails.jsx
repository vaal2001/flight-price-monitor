import TripLeg from "./TripLeg";
import { formatDate, getDuration, getOutboundDestination, getOutboundOrigin, getReturnDestination, getReturnOrigin, getTripValue } from "./utils/utils";

export default function TripDetails({ trip, onBack }) {
    const outboundOrigin = getOutboundOrigin(trip);
    const outboundDestination = getOutboundDestination(trip);
    const returnOrigin = getReturnOrigin(trip);
    const returnDestination = getReturnDestination(trip);

    const outboundDate = getTripValue(
        trip,
        'outboundDate',
        'departureDate',
        'date'
    );

    const returnDate = getTripValue(
        trip,
        'returnDate',
        'inboundDate',
        'backDate',
        'back_date'
    );

    const url = getTripValue(trip, 'url', 'link', 'bookingUrl');
    const duration = getDuration(trip);

    return (
        <>
            <main className="app details-app">
                <button className="back-button" onClick={onBack} type="button">
                    <span aria-hidden="true">←</span> Back to timeline
                </button>

                <header className="details-header">
                    <p className="eyebrow">TRIP DETAILS</p>
                    <h1>Your flight trip</h1>
                    <p className="subtitle">Outbound and return routes for this flight option.</p>
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
                            <strong>{returnDate ? formatDate(returnDate) : 'Not provided'}</strong>
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
                            <p>Open the original listing to review the flight or continue to booking.</p>
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
        </>
    )
}