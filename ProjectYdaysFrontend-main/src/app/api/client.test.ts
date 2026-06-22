import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./client";
import { clearSession, readSession, writeSession } from "./session";

describe("API refresh", () => {
  beforeEach(() => clearSession());

  it("shares one refresh request across concurrent 401 responses", async () => {
    writeSession({ accessToken: "expired", refreshToken: "refresh", persistent: false });
    let refreshes = 0;
    let protectedCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/auth/refresh")) {
          refreshes += 1;
          return new Response(
            JSON.stringify({
              success: true,
              data: { accessToken: "new-access", refreshToken: "new-refresh" },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        protectedCalls += 1;
        if (protectedCalls <= 2) {
          return new Response(JSON.stringify({ error: "expired" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ success: true, data: { ok: true } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    const results = await Promise.all([
      apiRequest<{ ok: boolean }>("/one"),
      apiRequest<{ ok: boolean }>("/two"),
    ]);

    expect(results).toEqual([{ ok: true }, { ok: true }]);
    expect(refreshes).toBe(1);
    expect(readSession()?.accessToken).toBe("new-access");
  });
});
