import type { SearchedTrip, Trip } from "../../../models/tripModel";

export function formatDate(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value ? String(value) : "Not provided";
    }

    return date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}
export async function loadAllTripsSortedBySearchDate(): Promise<SearchedTrip[]> {
    const modules = import.meta.glob("../../../../../data/*.json");

    const entries = Object.entries(modules);

    const results = await Promise.all(
        entries.map(async ([filePath, loader]) => {
            try {
                const module = await loader();
                const data = (module as any).default ?? module;

                const filename = filePath.split("/").pop() ?? "";
                const searchDateString =
                    filename.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ??
                    data.searchDate;

                if (!searchDateString) {
                    return [];
                }

                const items = Array.isArray(data.results)
                    ? data.results
                    : Array.isArray(data)
                        ? data
                        : [];

                return items.map((item: any) => ({
                    searchDate: new Date(searchDateString),
                    trip: {
                        origin: item.origin,
                        destination: item.destination,
                        return: item.originReturn,
                        outbound: new Date(item.outboundDate),
                        inbound: new Date(item.returnDate),
                        days: item.tripDays,
                        price: item.price,
                        currency: item.currency,
                        url: item.url,
                    } satisfies Trip,
                }));
            } catch (error) {
                console.error(`Failed to load ${filePath}:`, error);
                return [];
            }
        })
    );

    return results
        .flat()
        .sort(
            (a, b) => b.searchDate.getTime() - a.searchDate.getTime()
        );
}