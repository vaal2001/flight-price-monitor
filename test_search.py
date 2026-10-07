from datetime import date, timedelta

from fli.models import (
    Airport,
    DateSearchFilters,
    FlightSegment,
    PassengerInfo,
)
from fli.search import SearchDates


start = date.today() + timedelta(days=7)
end = start + timedelta(days=2)

print(f"Testing AMS -> ATH")
print(f"Dates: {start} -> {end}")

filters = DateSearchFilters(
    passenger_info=PassengerInfo(adults=1),
    flight_segments=[
        FlightSegment(
            departure_airport=[[Airport.AMS, 0]],
            arrival_airport=[[Airport.ATH, 0]],
            travel_date=start.strftime("%Y-%m-%d"),
        )
    ],
    from_date=start.strftime("%Y-%m-%d"),
    to_date=end.strftime("%Y-%m-%d"),
)

try:
    search = SearchDates()
    results = search.search(filters) or []

    print(f"SUCCESS: got {len(results)} results")

    for result in results:
        print(result)

except Exception as e:
    print(f"SEARCH FAILED: {e}")
    raise
