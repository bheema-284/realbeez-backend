import React from "react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const [vendor, setVendor] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      router.push("/cab_vendor/login");
      return;
    }

    // Example fetch for vendor data (protected route)
    fetch("/api/cab_vendor/profile", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
      .then(async (res) => {
        if (res.status === 401) {
          // Token expired -> try refresh
          await refreshAccessToken();
        } else {
          const data = await res.json();
          setVendor(data);
        }
      })
      .catch(() => router.push("/cab_vendor/login"));
  }, []);

  async function refreshAccessToken() {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) return router.push("/cab_vendor/login");

    const res = await fetch("/api/cab_vendor/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();
    if (data.accessToken) {
      localStorage.setItem("accessToken", data.accessToken);
      window.location.reload();
    } else {
      router.push("/cab_vendor/login");
    }
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-4">Cab Vendor Dashboard</h1>
      {vendor ? (
        <p className="text-lg">Welcome, {vendor.email}</p>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
