import "server-only";
import { cache } from "react";
import { api } from "./api";
import { PHONE, PHONE_HREF } from "./labels";
import type { House, SiteContent } from "./types";

/** Everything the owners can edit, fetched once per page render. */
export const getContent = cache(() => api.get<SiteContent>("/public/content"));

// used when the API can't be reached, so error and 404 pages still show a way to call
const FALLBACK_HOUSE: House = {
  phone: PHONE,
  phoneHref: PHONE_HREF,
  address: "Chester, Virginia 23831",
  town: "Chester, Virginia",
  tourNote: "Tours by appointment.",
  footerBlurb: "A home in Chester, Virginia, for veterans, people in recovery and independent seniors.",
  footerTagline: "",
};

/** House details (phone, address, footer lines). Never throws. */
export const getHouse = cache(async (): Promise<House> => {
  try {
    return (await getContent()).house;
  } catch {
    return FALLBACK_HOUSE;
  }
});
