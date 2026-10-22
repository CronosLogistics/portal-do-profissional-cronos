import { describe, expect, it } from "vitest";
import { contentAdminUrl, isPortalUserAdministration } from "@/lib/content-admin";

describe("Single source content administration", () => {
  it("directs benefit creation and editing to the existing benefit panel", () => {
    expect(contentAdminUrl("/admin/beneficio/novo")).toBe("https://espacodoprofissionalcronos.lovable.app/admin/beneficios");
    expect(contentAdminUrl("/admin/beneficio/76d9358d-6f50-4537-a203-a8fd7dd5a232")).toBe("https://espacodoprofissionalcronos.lovable.app/admin/beneficios");
  });
  it("keeps only user administration inside the portal", () => {
    expect(isPortalUserAdministration("/admin/usuarios")).toBe(true);
    for (const path of ["/admin", "/admin/beneficios", "/admin/beneficio/novo", "/admin/recompensas", "/admin/parceiro/novo", "/admin/cadastros", "/admin/pagina-inicial"]) {
      expect(isPortalUserAdministration(path)).toBe(false);
    }
  });
});