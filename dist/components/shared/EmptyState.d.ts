import type { LucideIcon } from 'lucide-react';
interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    className?: string;
    children?: React.ReactNode;
}
export declare function EmptyState({ icon: Icon, title, description, className, children }: EmptyStateProps): import("react/jsx-runtime").JSX.Element;
export {};
