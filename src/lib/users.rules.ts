export const USER_ROLES = [
  { value: "funcionario", label: "Funcionário" },
  { value: "rh", label: "Gestão de Pessoas (editor de conteúdo)" },
  { value: "admin", label: "Administrador" },
] as const;

export type UserRole = (typeof USER_ROLES)[number]["value"];

export function roleLabel(role: UserRole) {
  return USER_ROLES.find((r) => r.value === role)?.label ?? role;
}

/** Validação compartilhada entre a tela e o servidor. */
export function normalizeUserInput(input: { email: string; fullName: string; employeeId: string; role: string }) {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  const employeeId = input.employeeId.trim();
  if (!fullName) throw new Error("Informe o nome completo.");
  if (fullName.length > 120) throw new Error("O nome deve ter no máximo 120 caracteres.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Informe um e-mail válido.");
  if (employeeId.length > 40) throw new Error("A matrícula deve ter no máximo 40 caracteres.");
  if (!USER_ROLES.some((r) => r.value === input.role)) throw new Error("Selecione um perfil de acesso válido.");
  return { email, fullName, employeeId, role: input.role as UserRole };
}
