import { formatDate } from "./utils/utils";

export default function TripLeg({ label, origin, destination, date}) {
    return (
        <>
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
        </>
    )
}