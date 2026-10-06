import type { Node } from './model'
import { PaneView } from './PaneView'
import { SplitView } from './SplitView'

export function NodeView({ node }: { node: Node }) {
  return node.type === 'pane' ? <PaneView pane={node} /> : <SplitView split={node} />
}
