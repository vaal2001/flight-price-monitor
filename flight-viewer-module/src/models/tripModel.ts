import type { assignLanes } from "../pages/trips-overview/utils/tripsOverviewUtils";

export type Trip = {
    origin: string;
    destination: string;
    return: string;
    outbound: Date;
    inbound: Date;
    days: number;
    price: number;
    currency: string;
    url: string;
}

export type Timeline = {
    lanes: (ReturnType<typeof assignLanes>[number] & {
        left: number;
        width: number;
    })[];
    laneCount: number;
};

export type SearchedTrip = {
    searchDate: Date;
    trip: Trip;
};
