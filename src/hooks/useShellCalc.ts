
import { useShellStore } from '../store/useShellStore';

// Simple hook facade if we need to abstract the store later
export const useShellCalc = () => {
    return useShellStore();
};
