from datetime import date, timedelta
from pathlib import Path
import json
from SendTelegramMessage import SendTelegramMessage
from SearchFlightsRange import SearchFlightsRange

def sendTop(flights):
    maxLength = 3500
    message = "Top Flight Searches Today:\n\n"

    for flight in flights:
        flightMessage = (
            f"{flight['origin']} -> {flight['destination']} ({flight['outboundDate']})\n"
            f"{flight['destination']} -> {flight['originReturn']} ({flight['returnDate']})\n"
            f"For {flight['tripDays']} days: {flight['price']} {flight['currency']}\n"
            f"{flight['url']}\n\n"
        )

        if len(message) + len(flightMessage) > maxLength:
            SendTelegramMessage(message)
            message = ""

        message += flightMessage

    if message:
        SendTelegramMessage(message)

def DailySearch(searchParams):
    print("Starting flight price search")
    print("=" * 60)
    print(f"Flight dates: {searchParams['dateFrom']} -> {searchParams['dateTo']}")
    print()

    flights = SearchFlightsRange(
        origins=searchParams['origins'],
        destinations=searchParams['destinations'],
        dateFrom=searchParams['dateFrom'],
        dateTo=searchParams['dateTo'],
        minDays=searchParams['minDays'],
        maxDays=searchParams['maxDays'],
        adults=searchParams['adults'],
        roundtrip=searchParams['roundtrip'],
        directOnly=searchParams['directOnly'],
        maxRetries=searchParams['maxRetries'],
    )
    
    dataDirectory = Path("data")
    dataDirectory.mkdir(parents=True, exist_ok=True)

    outputFile = dataDirectory / f"{date.today().isoformat()}.json"

    data = {
        "searchDate": date.today().isoformat(),
        "results": flights,
    }

    with outputFile.open('w', encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)
    
    print()
    print(f"Saved {len(flights)} results to: {outputFile}")

    sendTop(flights)

if __name__ == "__main__":
    searchParams = {
        "origins": ["AMS", "RTM", "EIN"],
        "destinations": ["ATH"],
        "dateFrom": date.today().strftime("%Y-%m-%d"),
        "dateTo": (date.today() + timedelta(days=180)).strftime("%Y-%m-%d"),
        "minDays": 3,
        "maxDays": 10,
        "adults": 1,
        "roundtrip": True,
        "directOnly": True,
        "maxRetries": 4,
    }
    DailySearch(searchParams)

