import api from "./client";
import { fetchAssets, type Asset } from "./assets";

export type BookingStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export type Booking = {
  id: string;
  resourceId: string;
  bookedById: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  resource?: { id: string; name: string; assetTag: string };
  bookedBy?: { id: string; name: string };
};

// The booking a new request clashes with, returned by the API on a 409.
export type BookingConflict = {
  id: string;
  startTime: string;
  endTime: string;
  bookedBy: { id: string; name: string };
};

export async function fetchBookings(resourceId?: string): Promise<Booking[]> {
  const { data } = await api.get("/api/bookings", {
    params: resourceId ? { resourceId } : {},
  });
  return data.data.bookings;
}

// Bookable resources are just assets flagged isBookable. The assets endpoint has
// no server-side flag filter, so we fetch and narrow here.
export async function fetchBookableResources(): Promise<Asset[]> {
  const assets = await fetchAssets();
  return assets.filter((a) => a.isBookable);
}

export type CreateBookingInput = {
  resourceId: string;
  startTime: string;
  endTime: string;
};

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const { data } = await api.post("/api/bookings", input);
  return data.data.booking;
}

export async function cancelBooking(id: string): Promise<Booking> {
  const { data } = await api.patch(`/api/bookings/${id}/cancel`);
  return data.data.booking;
}

export async function rescheduleBooking(
  id: string,
  input: { startTime: string; endTime: string }
): Promise<Booking> {
  const { data } = await api.patch(`/api/bookings/${id}/reschedule`, input);
  return data.data.booking;
}
