import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./LoginPage";

const login = vi.fn().mockResolvedValue(undefined);

vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    login,
    register: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    login.mockClear();
  });

  it("shows the demo account so a reviewer can sign in without guessing", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("demo@ledgerly.dev");
    expect(screen.getByLabelText("Password")).toHaveValue("DemoPass12$");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });
});
