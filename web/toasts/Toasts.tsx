import { KindBadge } from '../sidebar/badges'
import { useStore } from '../state/store'
import { dismissToast } from '../state/toasts'

export function Toasts() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className="toast" data-lasting={t.lasting || undefined}>
          <div className="toast-body">
            {t.doc && <div className="toast-eyebrow">new plan</div>}
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
              className="toast-action"
              onClick={() => {
                t.action!.run()
                dismissToast(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="toast-close" title="Close" onClick={() => dismissToast(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
