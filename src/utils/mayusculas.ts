// Fuerza que TODO lo que el usuario digite en el sistema quede en MAYUSCULAS.
//
// Se instala un unico listener global en fase de captura sobre el evento
// 'input'. Como React adjunta sus handlers en fase de burbujeo (bubbling),
// al modificar aqui `target.value` ANTES de que React lea el valor, el estado
// del componente se guarda ya en mayusculas (persiste en la base de datos).
//
// Quedan excluidos los campos sensibles donde las mayusculas romperian la
// informacion: contrasenas, correos, numeros y fechas. Tambien se puede
// excluir cualquier campo puntual agregandole el atributo `data-no-upper`.

// Tipos de <input> que SI se transforman a mayusculas.
const TIPOS_TEXTO = new Set(['text', 'search', 'tel', 'url', ''])

// Asigna el valor usando el setter NATIVO del prototipo (no el que React
// parcha en el nodo). Asi el "value tracker" de React NO se actualiza y React
// detecta el cambio, disparando el onChange del componente (indispensable para
// que los buscadores/inputs controlados sigan filtrando).
function asignarValorNativo(
  el: HTMLInputElement | HTMLTextAreaElement,
  valor: string,
): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value')
  descriptor?.set?.call(el, valor)
}

function forzarMayusculas(evento: Event): void {
  const el = evento.target as HTMLElement | null
  if (!el) return

  let campo: HTMLInputElement | HTMLTextAreaElement
  if (el.tagName === 'TEXTAREA') {
    campo = el as HTMLTextAreaElement
  } else if (el.tagName === 'INPUT') {
    const input = el as HTMLInputElement
    const tipo = (input.type || 'text').toLowerCase()
    if (!TIPOS_TEXTO.has(tipo)) return
    campo = input
  } else {
    return
  }

  // Permite excluir campos concretos con data-no-upper o autocomplete de clave.
  if (el.hasAttribute('data-no-upper')) return

  const original = campo.value
  const mayus = original.toUpperCase()
  if (mayus === original) return

  // Conserva la posicion del cursor tras reemplazar el valor.
  const inicio = campo.selectionStart
  const fin = campo.selectionEnd
  asignarValorNativo(campo, mayus)
  if (inicio !== null && fin !== null) {
    try {
      campo.setSelectionRange(inicio, fin)
    } catch {
      // Algunos tipos de input no soportan setSelectionRange; se ignora.
    }
  }
}

// Instala el listener una sola vez.
export function instalarMayusculasGlobal(): void {
  document.addEventListener('input', forzarMayusculas, true)
}
