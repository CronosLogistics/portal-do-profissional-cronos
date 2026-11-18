import { describe, expect, it } from "vitest";
import { selecionarGestorPerfil } from "@/lib/perfil-gestor.rules";

const pessoas = [
  { id: "coordenador", full_name: "Gabrielle Rossato - Cronos Logistics", is_active: true },
  { id: "supervisor", full_name: "Supervisor", is_active: true },
  { id: "lider", full_name: "Fabio Rengel", is_active: true },
];
function gestor(nivel: string, disponiveis = ["lider", "supervisor", "coordenador"]) {
  const vinculos = ["lider", "supervisor", "coordenador"].map(id => ({
    usuario_id: id, perfis: { departamento_sp_id: "1", nivel_departamento: id },
  }));
  vinculos.push({ usuario_id: "profissional", perfis: { departamento_sp_id: "1", nivel_departamento: nivel } });
  return selecionarGestorPerfil("profissional", disponiveis.map(id => ({ departamento_id: "1", lider_id: id })), vinculos, pessoas);
}
describe("gestor do perfil pela hierarquia corporativa", () => {
  it("prioriza coordenador para integrante da equipe, mesmo com supervisor", () => {
    expect(gestor("liderado")).toBe("Gabrielle Rossato");
  });
  it("usa supervisor para integrante sem coordenador", () => {
    expect(gestor("liderado", ["lider", "supervisor"])).toBe("Supervisor");
  });
  it("usa líder direto para integrante sem coordenador nem supervisor", () => {
    expect(gestor("liderado", ["lider"])).toBe("Fabio Rengel");
  });
  it("coordenador usa exclusivamente líder direto", () => {
    expect(gestor("coordenador")).toBe("Fabio Rengel");
    expect(gestor("coordenador", ["supervisor"])).toBeNull();
  });
  it("supervisor usa coordenador antes do líder direto", () => {
    expect(gestor("supervisor")).toBe("Gabrielle Rossato");
  });
  it("supervisor sem coordenador usa líder direto", () => {
    expect(gestor("supervisor", ["lider"])).toBe("Fabio Rengel");
  });
  it("ignora vínculos de outro departamento e gestores inativos", () => {
    expect(selecionarGestorPerfil("profissional", [{ departamento_id: "1", lider_id: "coordenador" }],
      [{ usuario_id: "coordenador", perfis: { departamento_sp_id: "2", nivel_departamento: "coordenador" } }], pessoas)).toBeNull();
    expect(selecionarGestorPerfil("profissional", [{ departamento_id: "1", lider_id: "coordenador" }],
      [{ usuario_id: "coordenador", perfis: { departamento_sp_id: "1", nivel_departamento: "coordenador" } }],
      pessoas.map(p => ({ ...p, is_active: false })))).toBeNull();
  });
});