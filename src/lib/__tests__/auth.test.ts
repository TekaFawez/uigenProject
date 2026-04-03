// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({ set: mockSet })),
}));

const { createSession } = await import("@/lib/auth");

describe("createSession", () => {
  beforeEach(() => {
    mockSet.mockClear();
  });

  test("sets an http-only cookie", async () => {
    await createSession("user-1", "test@example.com");

    expect(mockSet).toHaveBeenCalledOnce();
    const [, , options] = mockSet.mock.calls[0];
    expect(options.httpOnly).toBe(true);
  });

  test("cookie name is auth-token", async () => {
    await createSession("user-1", "test@example.com");

    const [name] = mockSet.mock.calls[0];
    expect(name).toBe("auth-token");
  });

  test("token contains correct userId and email", async () => {
    await createSession("user-42", "hello@example.com");

    const [, token] = mockSet.mock.calls[0];
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "development-secret-key"
    );
    const { payload } = await jwtVerify(token, secret);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@example.com");
  });

  test("cookie expires ~7 days from now", async () => {
    const before = Date.now();
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, , options] = mockSet.mock.calls[0];
    const expires: Date = options.expires;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("cookie has sameSite lax and path /", async () => {
    await createSession("user-1", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });
});
