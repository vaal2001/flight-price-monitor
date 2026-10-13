from datetime import date, timedelta
from pathlib import Path
import json
import configparser
import argparse
from SendTelegramMessage import SendTelegramMessage
from SearchFlightsRange import SearchFlightsRange

def loadConfig(configName):
    configPath = Path(__file__).resolve().parent / "configs" / configName

    config = configparser.ConfigParser()
    if not config.read(configPath):
        raise FileNotFoundError(f"Config file not found: {configPath}")

    settings = config["flight_search"]

    return {
        "origins": json.loads(settings["origins"]),
        "destinations": json.loads(settings["destinations"]),
        "returns": json.loads(settings["returns"]),
        "minDays": settings.getint("minDays"),
        "maxDays": settings.getint("maxDays"),
    }

def sendTop(flights):
    maxLength = 3500
    message = "Top Flight Searches Today:\n\n"

    for flight in flights[:20]:
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
        returns=searchParams['returns'],
        dateFrom=searchParams['dateFrom'],
        dateTo=searchParams['dateTo'],
        minDays=searchParams['minDays'],
        maxDays=searchParams['maxDays'],
        adults=searchParams['adults'],
        roundtrip=searchParams['roundtrip'],
        directOnly=searchParams['directOnly'],
        maxRetries=searchParams['maxRetries'],
    )
    
    dataDirectory = Path(__file__).resolve().parent.parent / "data"
    dataDirectory.mkdir(parents=True, exist_ok=True)

    configName = searchParams["configName"].lstrip(".")
    outputFile = dataDirectory / f"{date.today().isoformat()}_{configName}.json"

    data = {
        "searchDate": date.today().isoformat(),
        "results": flights,
    }

    with outputFile.open('w', encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)
    
    print()
    print(f"Saved {len(flights)} results to: {outputFile}")

    # sendTop(flights)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()

    searchParams = {
        **loadConfig(args.config),
        "configName": args.config,
        "dateFrom": date.today().isoformat(),
        "dateTo": (date.today() + timedelta(days=179)).isoformat(),
        "adults": 1,
        "roundtrip": True,
        "directOnly": True,
        "maxRetries": 4,
    }
    DailySearch(searchParams)

