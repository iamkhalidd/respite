import { api } from "./api";
import type { BedView, RoomWithBeds } from "./types";

export type { BedState, BedView, RoomWithBeds } from "./types";

export const getBeds = () => api.get<BedView[]>("/public/beds");
export const getRoomsWithBeds = () => api.get<RoomWithBeds[]>("/public/rooms");
