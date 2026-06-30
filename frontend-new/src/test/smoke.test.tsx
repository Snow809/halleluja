import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChakraProvider } from "@chakra-ui/react";
import { roleToShell } from "@/app/AuthContext";
import { StatusBadge } from "@/purity";
import { theme } from "@/theme/theme";

describe("frontend-new smoke checks", () => {
  it("maps backend roles to the correct app shells", () => {
    expect(roleToShell("COLLABORATOR")).toBe("employee");
    expect(roleToShell("HR")).toBe("hr");
    expect(roleToShell("MANAGER")).toBe("manager");
    expect(roleToShell("ADMIN")).toBe("admin");
  });

  it("renders Chakra/Purity shared components", () => {
    render(
      <ChakraProvider theme={theme}>
        <StatusBadge value="APPROVED" />
      </ChakraProvider>,
    );

    expect(screen.getByText("APPROVED")).toBeInTheDocument();
  });
});
