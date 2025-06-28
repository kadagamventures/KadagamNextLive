const isProd = process.env.NODE_ENV === "production";

module.exports = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "None" : "Lax",
  domain: isProd ? ".kadagamnext.com" : undefined, // Only set domain in production
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
