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
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Clock,
  Crown,
  Download,
  Filter,
  Headphones,
  MessageSquare,
  Minus,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  Upload,
  User,
  UserPlus,
  Users,
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
