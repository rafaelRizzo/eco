// Regra pura de invalidação de sessão: token emitido antes da última troca de senha deixa de valer.
// Fica fora de auth.ts pra poder ser testada sem carregar o env (JWT_SECRET etc.).

// `iat` do JWT é em segundos; por isso a troca é truncada pra segundos. Token emitido no mesmo segundo da troca
// (ex.: o novo token devolvido logo após trocar a senha) continua válido.
export const isTokenStale = (iat: number, passwordChangedAt: Date | null | undefined) => {
    if (!passwordChangedAt) return false
    return iat < Math.floor(passwordChangedAt.getTime() / 1000)
}
