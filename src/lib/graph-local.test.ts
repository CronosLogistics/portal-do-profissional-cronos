import { describe, expect, it } from "vitest";
import { reescreverUrlGraph } from "./graph-local";
describe("reescreverUrlGraph", () => {
  it("azure_graph vai para graph.microsoft.com", () => {
    expect(reescreverUrlGraph("https://connector-gateway.lovable.dev/azure_graph/v1.0/users?$top=1")).toBe("https://graph.microsoft.com/v1.0/users?$top=1");
  });
  it("microsoft_sharepoint ganha v1.0", () => {
    expect(reescreverUrlGraph("https://connector-gateway.lovable.dev/microsoft_sharepoint/sites/x")).toBe("https://graph.microsoft.com/v1.0/sites/x");
  });
  it("outras URLs não mudam", () => {
    expect(reescreverUrlGraph("https://example.com")).toBeNull();
  });
});
