import { useResource } from './useResource.js';

export function useCarparks(intervalMs) {
  return useResource(`${import.meta.env.BASE_URL}api/carparks`, intervalMs);
}
