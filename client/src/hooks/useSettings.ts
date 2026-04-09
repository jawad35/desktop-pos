// hooks/useSettings.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/electron-api";

export function useSettings() {
  const { data: settings, refetch, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const result = await api.getSettings();
      // Handle different response formats
      if (result.success && result.data) {
        return result.data;
      }
      if (result.data) {
        return result.data;
      }
      return { tax: 0, discount: 0 };
    },
  });

  return { settings, refetch, isLoading };
}