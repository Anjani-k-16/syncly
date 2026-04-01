import { create } from 'zustand';

export const useFriendStore = create((set) => ({
  pendingRequests: [],
  pendingCount: 0,

  setPendingRequests: (requests) =>
    set({ pendingRequests: requests, pendingCount: requests.length }),

  addPendingRequest: (request) =>
    set((s) => ({
      pendingRequests: [request, ...s.pendingRequests],
      pendingCount: s.pendingCount + 1,
    })),

  removePendingRequest: (requestId) =>
    set((s) => ({
      pendingRequests: s.pendingRequests.filter(r => r.id !== requestId),
      pendingCount: Math.max(0, s.pendingCount - 1),
    })),

  clearPending: () => set({ pendingRequests: [], pendingCount: 0 }),
}));