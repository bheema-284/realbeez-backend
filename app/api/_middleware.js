import { NextResponse } from "next/server";

export async function middleware(request) {
  const response = NextResponse.next();

  // Add CORS headers to every response
  response.headers.set(
    "Access-Control-Allow-Origin",
    "http://192.168.68.117:3000"
  ); // or your frontend URL
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, DELETE, PATCH, POST, PUT, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");

  // Handle preflight OPTIONS request separately
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: response.headers,
    });
  }

  return response;
}
