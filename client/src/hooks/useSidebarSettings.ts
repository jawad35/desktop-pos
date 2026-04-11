// hooks/useSidebarSettings.ts
import { useEffect, useState } from 'react';
import { api } from '@/services/electron-api';

export function useSidebarSettings() {
    const [visibleTabs, setVisibleTabs] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const result = await api.getSettings();
            if (result.success && result.data) {
                // visible_tabs is already parsed as array from the handler
                setVisibleTabs(result.data.visible_tabs || []);
            }
        } catch (error) {
            console.error('Failed to load sidebar settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return { visibleTabs, isLoading, refetch: loadSettings };
}