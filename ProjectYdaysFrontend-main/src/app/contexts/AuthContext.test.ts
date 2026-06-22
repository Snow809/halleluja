import { describe, expect, it } from "vitest";
import { roleToShell } from "./AuthContext";

describe("roleToShell", () => {
  it.each([
    ["COLLABORATOR", "employee"],
    ["HR", "hr"],
    ["MANAGER", "manager"],
    ["ADMIN", "admin"],
    ["QVT", null],
    ["DIRECTION", null],
  ] as const)("maps %s to %s", (role, shell) => {
    expect(roleToShell(role)).toBe(shell);
  });
});
