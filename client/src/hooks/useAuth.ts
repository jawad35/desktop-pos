// In hooks/useAuth.ts
import { useEffect, useState } from 'react';

export function useAuth() {
  const [shop, setShop] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadLocalShopData();
  }, []);

  const loadLocalShopData = async () => {
    if (window.electronAPI && window.electronAPI.getShopData) {
      const result = await window.electronAPI.getShopData();
      if (result.success && result.shop) {
        setShop(result.shop);
      }
    }
  };

  return { shop, user, isAuthenticated: !!shop };
}