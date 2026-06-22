import { beforeEach, describe, expect, it } from "vitest";
import { clearSession, readSession, writeSession } from "./session";

describe("session storage", () => {
  beforeEach(() => clearSession());

  it("uses localStorage when remember me is enabled", () => {
    writeSession({ accessToken: "access", refreshToken: "refresh", persistent: true });
    expect(localStorage.length).toBe(1);
    expect(sessionStorage.length).toBe(0);
    expect(readSession()?.accessToken).toBe("access");
  });

  it("uses sessionStorage when remember me is disabled", () => {
    writeSession({ accessToken: "access", refreshToken: "refresh", persistent: false });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(1);
  });
});
