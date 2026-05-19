import { useResource } from './useResource.js';

export function useCarparks(intervalMs) {
  return useResource('/api/carparks', intervalMs);
}
