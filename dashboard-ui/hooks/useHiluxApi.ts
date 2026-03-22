"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { defaultNumericDomain } from "recharts/types/state/selectors/axisSelectors";

const API_BASE = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "";

export function useHiluxApi() {
  const router = useRouter();

  const fetchApi = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem("hilux_auth_token");

    if (!token && endpoint !== "/hilux/auth") {
      router.push("/login");
      return null;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (res.status === 401) {
        localStorage.removeItem("hilux_auth_token");
        router.push("/login");
        return null;
      }

      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.error("API Call Failed", err);
      throw err;
    }
  }, [router]);

  return { fetchApi };
}
