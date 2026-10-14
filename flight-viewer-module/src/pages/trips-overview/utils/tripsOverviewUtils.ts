import type { Trip } from "../../../models/tripModel";

const modules = import.meta.glob("../../../../../data/*.json");

export function getAllSnapshots(): string[] {
  const dates = [
    ...new Set(
      Object.keys(modules)
        .map((filePath) => {
          const filename = filePath.split("/").pop() ?? "";
          return filename.match(/^(\d{4}-\d{2}-\d{2})(?:_.*)?\.json$/)?.[1];
        })
        .filter((date): date is string => date !== undefined)
    ),
  ].sort((a, b) => b.localeCompare(a)); // newest first

  return dates;
}

export async function loadTrips(snapshotName: string): Promise<Trip[]> {
  const matchingEntries = Object.entries(modules).filter(([filePath]) =>
    filePath.includes(snapshotName)
  );

  const trips: Trip[] = [];

  await Promise.all(
    matchingEntries.map(async ([filePath, loader]) => {
      try {
        const module = await loader();
        const data = (module as any).default ?? module;

        const results = Array.isArray(data.results)
          ? data.results
          : Array.isArray(data)
            ? data
            : [];

        for (const item of results) {
          trips.push({
            origin: item.origin,
            destination: item.destination,
            return: item.originReturn,
            outbound: new Date(item.outboundDate),
            inbound: new Date(item.returnDate),
            days: item.tripDays,
            price: item.price,
            currency: item.currency,
            url: item.url,
          });
        }
      } catch (err) {
        console.error(`Failed to load ${filePath}:`, err);
      }
    })
  );

  return trips;
}

export function formatPrice(price: number, currency: string) {

  if (!Number.isFinite(price)) return 'Price unavailable'

  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'EUR',
      maximumFractionDigits: 0,
    }).format(price)
  } catch {
    return `${currency || 'EUR'} ${Math.round(price)}`
  }
}

export function getLowestPrice(trips: Trip[]) {
  return Math.min(...trips.map(trip => trip.price));
}

export function getHighestPrice(trips: Trip[]) {
  return Math.max(...trips.map(trip => trip.price));
}

export function buildMonths(trips: Trip[]): { date: Date; label: string }[] {
  const months = new Map<string, Date>();

  for (const trip of trips) {
    const date = new Date(trip.outbound);
    const end = new Date(trip.inbound);

    date.setDate(1);

    while (date <= end) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      months.set(key, new Date(date));
      date.setMonth(date.getMonth() + 1);
    }
  }

  return [...months.values()]
    .sort((a, b) => a.getTime() - b.getTime())
    .map(date => ({
      date,
      label: date.toLocaleString("en-US", {
        month: "long",
      }),
    }));
}

export function assignLanes(trips: Trip[]) {
  const sorted = trips
    .map((trip) => ({
      trip,
      dates: {
        start: trip.outbound,
        end: trip.inbound,
      },
    }))
    .sort(
      (a, b) =>
        a.dates.start.getTime() - b.dates.start.getTime() ||
        a.dates.end.getTime() - b.dates.end.getTime()
    );

  const laneEnds: number[] = [];

  return sorted.map((item) => {
    let lane = laneEnds.findIndex(
      (end) => end < item.dates.start.getTime()
    );

    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.dates.end.getTime());
    } else {
      laneEnds[lane] = item.dates.end.getTime();
    }

    return { ...item, lane };
  });
}

export function getPriceColor(price: number, minPrice: number, maxPrice: number) {
  if (!Number.isFinite(price)) return '#8b95a5'

  const ratio =
    maxPrice === minPrice
      ? 0.5
      : Math.max(0, Math.min(1, (price - minPrice) / (maxPrice - minPrice)))

  const stops = [
    { position: 0, color: [22, 163, 74] },
    { position: 0.5, color: [234, 179, 8] },
    { position: 1, color: [220, 38, 38] },
  ]

  const lower = ratio <= 0.5 ? stops[0] : stops[1]
  const upper = ratio <= 0.5 ? stops[1] : stops[2]
  const localRatio =
    (ratio - lower.position) / (upper.position - lower.position)

  const rgb = lower.color.map((channel, index) =>
    Math.round(
      channel + (upper.color[index] - channel) * localRatio
    )
  )

  return `rgb(${rgb.join(', ')})`
}

export function getDate(value: string) {
  if (!value) return null

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}