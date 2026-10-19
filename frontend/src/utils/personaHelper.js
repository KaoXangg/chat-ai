/**
 * Helper localize thông tin Persona hệ thống (Official System Personas)
 * Tự động ánh xạ tên, vai trò, mô tả và câu hỏi mẫu theo ngôn ngữ người dùng đã chọn
 */
export function getLocalizedPersona(persona, t) {
  if (!persona) return persona;
  // Chỉ localize cho các persona hệ thống định sẵn (sys_*)
  const pid = persona.id || persona._id;
  if (!pid || (!persona.isSystem && !String(pid).startsWith("sys_"))) {
    return persona;
  }

  // Khóa định danh chuẩn dạng sys_senior_dev, sys_ielts_coach...
  const keyPrefix = `personas.${pid}`;
  const localizedName = t(`${keyPrefix}.name`);
  const localizedRole = t(`${keyPrefix}.role`);
  const localizedDesc = t(`${keyPrefix}.desc`);
  const localizedPrompt0 = t(`${keyPrefix}.prompt0`);

  const hasName = localizedName && localizedName !== `${keyPrefix}.name`;
  const hasRole = localizedRole && localizedRole !== `${keyPrefix}.role`;
  const hasDesc = localizedDesc && localizedDesc !== `${keyPrefix}.desc`;
  const hasPrompt0 = localizedPrompt0 && localizedPrompt0 !== `${keyPrefix}.prompt0`;

  return {
    ...persona,
    name: hasName ? localizedName : persona.name,
    role: hasRole ? localizedRole : persona.role,
    description: hasDesc ? localizedDesc : persona.description,
    suggestedPrompts:
      hasPrompt0 && Array.isArray(persona.suggestedPrompts) && persona.suggestedPrompts.length > 0
        ? [localizedPrompt0, ...persona.suggestedPrompts.slice(1)]
        : persona.suggestedPrompts,
  };
}
