/** Retorna true somente quando todos os campos obrigatórios do perfil foram preenchidos. */
export function isPerfilCompleto(profile: {
  avatar_url?: string | null;
  whatsapp?: string | null;
  data_nascimento?: string | null;
  cidade?: string | null;
  escola?: string | null;
  serie?: string | null;
  gender?: string | null;
} | null | undefined): boolean {
  if (!profile) return false;
  return !!(
    profile.avatar_url?.trim() &&
    profile.whatsapp?.trim() &&
    profile.data_nascimento &&
    profile.cidade?.trim() &&
    profile.escola?.trim() &&
    profile.serie?.trim() &&
    profile.gender && profile.gender !== 'U'
  );
}
