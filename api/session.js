import { ironSession } from "iron-session/edge";

const sessionOptions = {
  password: "complex_password_12345678901234567890", // same as login.js
  cookieName: "bobflix_session",
  cookieOptions: {
    secure: true,
    sameSite: "strict",
    httpOnly: true,
  },
};

const session = ironSession(sessionOptions);

export default async function handler(req) {
  const res = new Response(null);
  const sessionStore = session(req, res);
  const user = await sessionStore.get("user");

  if (!user) {
    return new Response(JSON.stringify({ error: "Not logged in" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ username: user.username }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
