// Follows the mouse from a mousedown until release, for dividers and the
// sidebar edge. Iframes swallow mouse events, so a transparent shield covers
// the page meanwhile. It also stops if the button was released somewhere we
// never heard about (outside the window, or during a native drag).
export function trackMouse(e: React.MouseEvent, cursor: 'col-resize' | 'row-resize', onMove: (ev: MouseEvent) => void) {
  e.preventDefault()
  const shield = document.createElement('div')
  shield.className = 'shield'
  shield.style.cursor = cursor
  document.body.append(shield)

  const move = (ev: MouseEvent) => (ev.buttons === 0 ? stop() : onMove(ev))
  const stop = () => {
    shield.remove()
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', stop)
    window.removeEventListener('blur', stop)
  }
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', stop)
  window.addEventListener('blur', stop)
}
