// hooks/useLoginType.ts
import { useEffect, useState } from 'react';
import { api } from '@/services/electron-api';

export function useLoginType() {
    const [loginType, setLoginType] = useState<'operator' | 'admin'>('operator');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadLoginType();
    }, []);

    const loadLoginType = async () => {
        try {
            const result = await api.getLoginType();
            if (result.success) {
                setLoginType(result.login_type);
            }
        } catch (error) {
            console.error('Failed to load login type:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const switchToAdmin = async (pin: string) => {
        const result = await api.verifyAdminPin(pin);
        if (result.success) {
            await api.setLoginType('admin');
            setLoginType('admin');
            return true;
        }
        return false;
    };

    const switchToOperator = async () => {
        await api.setLoginType('operator');
        setLoginType('operator');
    };

    return { loginType, isLoading, switchToAdmin, switchToOperator, refetch: loadLoginType };
}