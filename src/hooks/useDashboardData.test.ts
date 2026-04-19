import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

const supabaseMocks = vi.hoisted(() => {
  const subscribeResult = { unsubscribe: vi.fn() };
  const subscribe = vi.fn(() => subscribeResult);
  const chain = {
    on: vi.fn(),
    subscribe,
  };
  chain.on.mockImplementation(() => chain);
  const removeChannel = vi.fn();
  const channel = vi.fn(() => chain);
  return { subscribeResult, subscribe, on: chain.on, removeChannel, channel, chain };
});

vi.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock("@/hooks/useTasksPersistence", () => ({
  useTasksPersistence: () => ({
    createTask: vi.fn(),
    toggleTask: vi.fn(),
  }),
}));

vi.mock("@/lib/data-api", () => ({
  dataApiHelpers: {
    select: vi.fn(async () => ({ data: [] })),
  },
}));

vi.mock("@/lib/edge-functions", () => ({
  invokeEdgeFunction: vi.fn(async () => ({ ok: true, data: { connected: false, stats: {} } })),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: supabaseMocks.channel,
    removeChannel: supabaseMocks.removeChannel,
  },
}));

import { useDashboardData } from "@/hooks/useDashboardData";

describe("useDashboardData realtime drive accounts", () => {
  it("subscribes to drive_accounts changes and cleans up", () => {
    const { unmount } = renderHook(() => useDashboardData());

    expect(supabaseMocks.channel).toHaveBeenCalledWith("dashboard-drive-accounts");
    expect(supabaseMocks.channel).toHaveBeenCalledWith("dashboard-circles");
    expect(supabaseMocks.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "drive_accounts" },
      expect.any(Function)
    );
    expect(supabaseMocks.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "relationship_contacts" },
      expect.any(Function)
    );
    expect(supabaseMocks.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "relationship_contact_reminders" },
      expect.any(Function)
    );
    expect(supabaseMocks.subscribe).toHaveBeenCalledTimes(2);

    expect(supabaseMocks.removeChannel).not.toHaveBeenCalled();

    unmount();
    expect(supabaseMocks.removeChannel).toHaveBeenCalledTimes(2);
    expect(supabaseMocks.removeChannel).toHaveBeenCalledWith(supabaseMocks.subscribeResult);
  });
});

