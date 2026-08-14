import * as React from "react"
import { cn } from "../../lib/utils"

const badgeVariants = ({ variant = 'default' }: { variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'critical' | 'high' | 'moderate' | 'stable' | 'other' | 'ama' | 'ina' }) => {
  const base = "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
    critical: "border-transparent bg-red-950 text-red-400 border border-red-900/50 hover:bg-red-900/50",
    high: "border-transparent bg-orange-950 text-orange-400 border border-orange-900/50 hover:bg-orange-900/50",
    moderate: "border-transparent bg-amber-950 text-amber-400 border border-amber-900/50 hover:bg-amber-900/50",
    stable: "border-transparent bg-teal-950 text-teal-400 border border-teal-900/50 hover:bg-teal-900/50",
    ama: "border-indigo-800 bg-indigo-950 text-indigo-300",
    ina: "border-cyan-800 bg-cyan-950 text-cyan-300",
    other: "border-slate-700 bg-slate-800 text-slate-300",
  };
  return cn(base, variants[variant]);
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'critical' | 'high' | 'moderate' | 'stable' | 'other' | 'ama' | 'ina';
  }

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
