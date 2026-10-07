import { FilePlus2, X } from '../icons'
import { KindBadge } from '../sidebar/badges'
import { useStore } from '../state/store'
import { dismissToast } from '../state/toasts'

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast popover" data-lasting={t.lasting || undefined}>
          {t.doc && <FilePlus2 />}
          <div className="toast-body">
            {t.doc && <div className="toast-eyebrow">New plan</div>}
            <div className="toast-text">{t.text}</div>
            {t.detail && <div className="toast-detail">{t.detail}</div>}
            {t.doc && (
              <div className="toast-doc">
                <KindBadge kind={t.doc.kind} />
                <span className="toast-doc-name">{t.doc.title}</span>
              </div>
            )}
          </div>
          {t.action && (
            <button
              type="button"
              className={t.lasting ? 'btn primary toast-action' : 'btn toast-action'}
              onClick={() => {
                t.action!.run()
                dismissToast(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" className="icon-btn sm toast-close" title="Close" onClick={() => dismissToast(t.id)}>
            <X />
          </button>
        </div>
      ))}
    </div>
  )
}
