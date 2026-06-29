import {
    type LucideIcon,
    type LucideProps,
    ArrowRight,
    Bell,
    BookOpen,
    Calendar,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock,
    Feather,
    FileText,
    Flame,
    Home,
    Info,
    LayoutGrid,
    Lock,
    LogOut,
    Mail,
    MoreVertical,
    Moon,
    PanelLeft,
    Pause,
    Pencil,
    Play,
    Plus,
    RotateCcw,
    ScrollText,
    Search,
    Settings,
    Sun,
    Target,
    Terminal,
    Timer,
    TrendingUp,
    Trash2,
    Upload,
    User,
    X,
    Zap,
} from "lucide-react";

function make(IconComponent: LucideIcon, defaultSize = 16) {
    return function WrappedIcon(props: LucideProps) {
        return <IconComponent size={defaultSize} strokeWidth={2} {...props} />;
    };
}

function BrandGithub(props: LucideProps) {
    return (
        <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.73-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.21.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.66-.31-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23A11.5 11.5 0 0 1 12 5.8c1.02 0 2.05.14 3 .4 2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.19.7.8.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
        </svg>
    );
}

function BrandGoogle(props: LucideProps) {
    return (
        <svg width={props.size ?? 16} height={props.size ?? 16} viewBox="0 0 24 24" fill="none" stroke="none" {...props}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
        </svg>
    );
}

export const Icon = {
    grid: make(LayoutGrid),
    home: make(Home),
    github: BrandGithub,
    google: BrandGoogle,
    cal: make(Calendar),
    calendar: make(Calendar),
    book: make(BookOpen),
    target: make(Target),
    file: make(FileText),
    fileText: make(FileText),
    check: make(Check, 14),
    x: make(X, 14),
    clock: make(Clock, 14),
    fire: make(Flame),
    search: make(Search),
    trend: make(TrendingUp),
    terminal: make(Terminal),
    panel: make(PanelLeft),
    panelSoft: make(PanelLeft),
    chevronLeft: make(ChevronLeft),
    chevronRight: make(ChevronRight),
    chevronUp: make(ChevronUp),
    chevronDown: make(ChevronDown),
    timer: make(Timer),
    play: make(Play),
    pause: make(Pause),
    reset: make(RotateCcw),
    log: make(ScrollText),
    zap: make(Zap),
    moon: make(Moon),
    sun: make(Sun),
    settings: make(Settings),
    logout: make(LogOut),
    plus: make(Plus, 15),
    upload: make(Upload),
    info: make(Info),
    user: make(User),
    mail: make(Mail),
    lock: make(Lock),
    arrow: make(ArrowRight),
    bell: make(Bell),
    feather: make(Feather),
    more: make(MoreVertical),
    edit: make(Pencil, 15),
    trash: make(Trash2, 15),
};
