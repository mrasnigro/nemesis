/**
 * Outline icons via lucide-react (https://lucide.dev).
 * Keep the `name` API stable so pages can swap icons without hand-drawn SVG paths.
 */
import {
  ArrowUpDown,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Clock,
  AlertCircle,
  ChevronLeft,
  Copy,
  Crown,
  Download,
  Filter,
  Headphones,
  History,
  MessageSquare,
  Mic,
  Minus,
  Paperclip,
  Pencil,
  Phone,
  PhoneOff,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Trash2,
  Trophy,
  Upload,
  User,
  UserPlus,
  Users,
  Volume2,
  X,
} from 'lucide-react'

const ICONS = {
  calendar: Calendar,
  filter: Filter,
  export: Upload,
  download: Download,
  chart: BarChart3,
  headset: Headphones,
  notebook: BookOpen,
  settings: Settings,
  user: User,
  users: Users,
  search: Search,
  refresh: RefreshCw,
  paperclip: Paperclip,
  building: Building2,
  plus: Plus,
  x: X,
  sliders: SlidersHorizontal,
  clipboard: ClipboardList,
  pencil: Pencil,
  save: Save,
  minus: Minus,
  chevron: ChevronRight,
  chevronDown: ChevronDown,
  phone: Phone,
  chat: MessageSquare,
  userPlus: UserPlus,
  shield: ShieldCheck,
  chevronsLeft: ChevronsLeft,
  chevronsRight: ChevronsRight,
  clock: Clock,
  trophy: Trophy,
  crown: Crown,
  sort: ArrowUpDown,
  star: Star,
  trash: Trash2,
  copy: Copy,
  mic: Mic,
  phoneOff: PhoneOff,
  volume: Volume2,
  play: Play,
  redo: RotateCcw,
  alert: AlertCircle,
  chevronLeft: ChevronLeft,
  history: History,
}

export default function OutlineIcon({ name, className = '', size, strokeWidth = 1.75, ...rest }) {
  const Icon = ICONS[name]
  if (!Icon) return null

  return (
    <Icon
      className={`training-ai__outline-icon ${className}`.trim()}
      size={size}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  )
}
