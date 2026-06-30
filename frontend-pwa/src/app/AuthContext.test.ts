import { describe, expect, it } from "vitest";
import { mobileHomeForShell, roleToShell } from "./AuthContext";

describe("mobile role routing", () => {
  it("maps supported backend roles to mobile homes", () => {
    expect(roleToShell("COLLABORATOR")).toBe("employee");
    expect(roleToShell("MANAGER")).toBe("manager");
    expect(mobileHomeForShell("employee")).toBe("/employee/home");
    expect(mobileHomeForShell("manager")).toBe("/manager/home");
    expect(mobileHomeForShell("admin")).toBe("/desktop-required");
  });
});
