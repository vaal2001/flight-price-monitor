import { Route, Routes } from "react-router";
import TripsOverview from "./pages/trips-overview/TripsOverview";
import TripOverview from "./pages/trip-overview/TripOverview";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<TripsOverview />} />
      <Route path="/overview" element={<TripsOverview />} />
      <Route path="/trip-overview" element={<TripOverview />} />
    </Routes>
  );
}