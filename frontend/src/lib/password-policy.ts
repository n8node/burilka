export const passwordRules = [
  { key: "length", label: "Не менее 8 символов", test: (value: string) => value.length >= 8 },
  { key: "lower", label: "Строчная буква (a-z)", test: (value: string) => /[a-z]/.test(value) },
  { key: "upper", label: "Заглавная буква (A-Z)", test: (value: string) => /[A-Z]/.test(value) },
  { key: "digit", label: "Цифра (0-9)", test: (value: string) => /[0-9]/.test(value) },
  { key: "special", label: "Спецсимвол (!@#$...)", test: (value: string) => /[^a-zA-Z0-9]/.test(value) },
] as const;

export function getPasswordChecks(value: string) {
  return passwordRules.map((rule) => ({ ...rule, valid: rule.test(value) }));
}

export function isPasswordStrong(value: string) {
  return getPasswordChecks(value).every((rule) => rule.valid);
}

export function getPasswordStrength(value: string) {
  const count = getPasswordChecks(value).filter((rule) => rule.valid).length;
  if (!value) return 0;
  if (count <= 2) return 1;
  if (count === 3) return 2;
  if (count === 4) return 3;
  return value.length >= 12 ? 4 : 3;
}