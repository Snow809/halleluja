import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownMessage } from "./MarkdownMessage";

describe("MarkdownMessage", () => {
  it("renders lists and GitHub-flavored tables", () => {
    render(
      <MarkdownMessage content={"## Team\n\n- Nadia\n- Omar\n\n| Manager | Team |\n|---|---:|\n| Omar | 12 |"} />,
    );

    expect(screen.getByRole("heading", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByRole("list")).toBeInTheDocument();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Manager")).toBeInTheDocument();
    expect(within(table).getByText("12")).toBeInTheDocument();
  });

  it("does not render raw HTML from an answer", () => {
    const { container } = render(<MarkdownMessage content={'<script>alert("x")</script>\n\nSafe'} />);

    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("Safe")).toBeInTheDocument();
  });
});
