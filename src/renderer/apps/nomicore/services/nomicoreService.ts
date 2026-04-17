export interface NomicoreSalaryRequest {
  country: string
  contractType: string
  grossMonthly: number
  year?: number
}

export const nomicoreCalcService = {
  async login(): Promise<{ loggedIn: boolean }> {
    const result = await window.api.nomicore.login()
    if ((result as any).__ipcError) throw new Error((result as any).message)
    return result as { loggedIn: boolean }
  },

  async checkSession(): Promise<{ valid: boolean }> {
    const result = await window.api.nomicore.checkSession()
    if ((result as any).__ipcError) throw new Error((result as any).message)
    return result as { valid: boolean }
  },

  async calculate(params: NomicoreSalaryRequest) {
    const result = await window.api.nomicore.calculate(params)
    if ((result as any).__ipcError) throw new Error((result as any).message)
    return result
  },
}
