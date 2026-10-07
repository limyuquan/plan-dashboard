import { ChevronRight, FaceSlightlySmiling, FilePlusCorner } from 'lucide-react'

export {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Columns2,
  Copy,
  Ellipsis,
  FileText,
  FolderOpen,
  Keyboard,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  Search,
  Settings,
  SquareSplitHorizontal,
  SquareSplitVertical,
  Sun,
  Undo2,
  X,
} from 'lucide-react'
export { FaceSlightlySmiling as Smile, FilePlusCorner as FilePlus2 }

const TURN = { left: 180, up: 270, right: 0, down: 90 }

// One chevron, turned to face the way it points.
export function Chevron({ dir, className }: { dir: keyof typeof TURN; className?: string }) {
  return <ChevronRight size={16} className={className} style={{ transform: `rotate(${TURN[dir]}deg)` }} />
}
