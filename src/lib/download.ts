/** Descarga un texto como archivo, sin servidor (funciona offline). */
export function downloadText(fileName: string, text: string, type = 'text/markdown;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Se libera después: algunos navegadores (Safari) leen la URL de forma diferida.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
