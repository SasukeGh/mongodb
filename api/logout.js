import { ironSession } from "iron-session/edge";

const sessionOptions = {
  password: "complex_password_12345678901234567890",
  cookieName: "bobflix_session",
  cookieOptions: {
    secure: true,
    sameSite: "strict",
    httpOnly: true,
  },
};

const session = ironSession(sessionOptions);

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const res = new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  const store = session(req, res);
  await store.destroy(); // Boom. Session gone.

  return res;
}
