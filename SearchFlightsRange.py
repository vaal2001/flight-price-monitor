from datetime import datetime, timedelta, date
from typing import List
import time, random
from urllib.parse import quote
from fli.models import (
    Airport,
    DateSearchFilters,
    FlightSegment,
    MaxStops,
    PassengerInfo,
    TripType,

)
from fli.search import SearchDates
from fli.models.google_flights.base import LocalizationConfig, Currency

def GoogleFlightsUrl(origin, destination, returnOrigin, outboundDate, returnDate, currency = "EUR"):
    origin = origin.upper()
    destination = destination.upper()
    returnOrigin = returnOrigin.upper()

    query = (f"Flights from {origin} to {destination} on {outboundDate}, then from {destination} to {returnOrigin} on {returnDate}")

    return f"https://www.google.com/travel/flights?q={quote(query)}&curr={quote(currency)}&hl=en"

def SearchFlightsRange(
    origins: List[str],
    destinations: List[str],
    dateFrom: str,
    dateTo: str,
    minDays: int,
    maxDays: int,
    adults: int = 1,
    roundtrip: bool = True,
    directOnly: bool = False,
    maxRetries: int = 4
) -> List[dict]:
    allResults = []

    def getAirport(code: str):
        try:
            return getattr(Airport, code.upper())
        except AttributeError:
            raise ValueError(f"Unknown airport code: {code}")

    originAirports = [getAirport(code) for code in origins]
    destinationAirports = [getAirport(code) for code in destinations]

    start = datetime.strptime(dateFrom, "%Y-%m-%d").date()
    end = datetime.strptime(dateTo, "%Y-%m-%d").date()

    def dateChunks(startDate, endDate, chunkSize=90):
        current = startDate
        while current <= endDate:
            chunkEnd = min(current + timedelta(days=chunkSize - 1), endDate)
            yield current, chunkEnd
            current = chunkEnd + timedelta(days=1)

    def isRetryableError(error):
        errorText = str(error).lower()
        retryableMessages = [
            "429",
            "rate limit",
            "too many requests",
            "timeout",
            "timed out",
            "connection",
            "temporarily unavailable",
            "service unavailable",
            "502",
            "503",
            "504",
        ] 

        return any(message in errorText for message in retryableMessages)

    def searchWithRetry(filters, routeDescription):
        for attempt in range(maxRetries + 1):
            try:
                localization = LocalizationConfig(currency=Currency.EUR)
                search = SearchDates(localization_config=localization)
                return search.search(filters) or []
            except Exception as e:
                if not isRetryableError(e):
                    raise

                if attempt >= maxRetries:
                    print(f"Failed after {maxRetries} retries: {routeDescription}")
                    raise

                baseDelay = min(300, 30 * (2 ** attempt))
                jitter = random.uniform(0, 10)
                delay = baseDelay + jitter

                print(f"Temporary error while searching {routeDescription}: {e}")
                print(f"Retrying in {delay:.1f} seconds (attempt {attempt + 1}/{maxRetries})...")

                time.sleep(delay)
        
        return []

    for origin in originAirports:
        for destination in destinationAirports:
            for originReturn in originAirports:
                for tripDays in range(minDays, maxDays + 1):
                    for chunkStart, chunkEnd in dateChunks(start, end):
                        routeDescription = f"{origin.name} -> {destination.name} -> {originReturn.name} ({tripDays} days, {chunkStart} to {chunkEnd})"

                        print(f"Fetching {routeDescription}")

                        filters = DateSearchFilters(
                            passenger_info=PassengerInfo(adults=adults),
                            flight_segments=[
                                FlightSegment(
                                    departure_airport=[[origin, 0]],
                                    arrival_airport=[[destination, 0]],
                                    travel_date=chunkStart.strftime("%Y-%m-%d"),
                                )
                            ],
                            from_date=chunkStart.strftime("%Y-%m-%d"),
                            to_date=chunkEnd.strftime("%Y-%m-%d"),
                        )

                        if roundtrip:
                            filters.flight_segments.append(
                                FlightSegment(
                                    departure_airport=[[destination, 0]],
                                    arrival_airport=[[originReturn, 0]],
                                    travel_date=chunkStart.strftime("%Y-%m-%d"),
                                )
                            )
                            filters.trip_type = TripType.ROUND_TRIP
                            filters.duration = tripDays

                        if directOnly:
                            filters.stops = MaxStops.NON_STOP

                        try:
                            time.sleep(random.uniform(3.0, 5.5))
                            results = searchWithRetry(filters, routeDescription)

                            for result in results:
                                dateValues = getattr(result, "date", None)

                                if isinstance(dateValues, (list, tuple)):
                                    outbound = str(dateValues[0]) if len(dateValues) > 0 else None
                                    ret = str(dateValues[1]) if len(dateValues) > 1 else None
                                else:
                                    outbound = str(dateValues) if dateValues else None
                                    ret = str(getattr(result, "return_date", None))

                                allResults.append({
                                    "origin": origin.name,
                                    "destination": destination.name,
                                    "originReturn": originReturn.name,
                                    "outboundDate": outbound,
                                    "returnDate": ret,
                                    "tripDays": tripDays,
                                    "price": result.price,
                                    "currency": getattr(result, "currency", "EUR"),
                                    "url": GoogleFlightsUrl(origin.name, destination.name, originReturn.name, outbound, ret, getattr(result, "currency", "EUR")),
                                })
                        except Exception as e:
                            print(f"Permanent failure for {routeDescription}: {e}")
                            continue

    allResults.sort(key=lambda x: x["price"] if x["price"] is not None else 999999)
    return allResults

if __name__ == "__main__":
    flights = SearchFlightsRange(
        origins=["AMS", "RTM", "EIN"],
        destinations=["ATH"],
        dateFrom=date.today().strftime("%Y-%m-%d"),
        dateTo=(date.today() + timedelta(days=180)).strftime("%Y-%m-%d"),
        minDays=3,
        maxDays=10,
        adults=1,
        roundtrip=True,
        directOnly=True,
        maxRetries=4,
    )

    for flight in reversed(flights):
        print(f'{flight["origin"]} -> {flight["destination"]} ({flight["outboundDate"]}) + {flight["destination"]} -> {flight["originReturn"]} ({flight["returnDate"]}) [{flight["tripDays"]}]: {flight["price"]} {flight["currency"]}')
