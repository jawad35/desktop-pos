import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function useAuth() {
  const [expired, setExpired] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // 1. Fetch user
  const {
    data: user,
    isLoading: isUserLoading,
    isError: isUserError,
  } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // 2. Fetch shop (external API)
  const {
    data: shop,
    isLoading: isShopLoading,
    isError: isShopError,
  } = useQuery({
    queryKey: ["shop", user?.shopId],
    queryFn: async () => {
      if (!user?.shopId) return null;

      const res = await fetch(
        `http://127.0.0.1:5002/api/shops/${user.shopId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch shop");

      return res.json();
    },
    enabled: !!user?.shopId,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: Infinity,
    cacheTime: Infinity,
  });

  // 3. Expiry check + alert state
  useEffect(() => {
    if (shop?.expiryDate) {
      const expiry = new Date(shop.expiryDate).getTime();
      const now = Date.now();

      if (expiry < now) {
        localStorage.removeItem("token");
        setExpired(true);
      } else {
        // if shop is active again
        setExpired(false);
      }
    }
  }, [shop?.expiryDate]);

  return {
    user,
    shop,
    expiryDate: shop?.expiryDate,
    isLoading: isUserLoading || isShopLoading,
    isAuthenticated: !!user && !expired,
    expired, // expose expiry state
    error: isUserError || isShopError,
  };
}
