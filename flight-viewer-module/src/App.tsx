import { Route, Routes } from "react-router";
import TripsOverview from "./pages/trips-overview/TripsOverview";
import TripOverview from "./pages/trip-overview/TripOverview";

export default function App() {
  const base: string = 'flight-price-monitor';
  
  return (
    <>
      <Routes>
        <Route path={base + '/'} element={<TripsOverview />} />
        <Route path={base + '/overview'} element={<TripsOverview />} />
        <Route path={base + '/trip-overview'} element={<TripOverview />} />
      </Routes>
    </>
  );
}