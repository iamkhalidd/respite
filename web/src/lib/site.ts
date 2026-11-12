export const siteUrl = () => (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
