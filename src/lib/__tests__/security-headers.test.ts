import { describe, expect, it } from "vitest";
import { SECURITY_HEADERS, withSecurityHeaders } from "../security-headers";

describe("withSecurityHeaders", () => {
  it("adds every header and keeps the response as it was", async () => {
    const secured = withSecurityHeaders(
      new Response("page", { status: 404, headers: { "content-type": "text/html" } }),
    );

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(secured.headers.get(name)).toBe(value);
    }
    expect(secured.status).toBe(404);
    expect(secured.headers.get("content-type")).toBe("text/html");
    expect(await secured.text()).toBe("page");
  });

  it("works on a response whose headers are immutable", () => {
    expect(withSecurityHeaders(Response.redirect("https://example.com")).status).toBe(302);
  });
});
