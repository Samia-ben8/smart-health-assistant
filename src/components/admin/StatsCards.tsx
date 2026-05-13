import { Card } from "@/components/ui/card";
import { Calendar, Clock, CalendarDays, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface Stats {
  total: number;
  urgent: number;
  non_urgent: number;
  today: number;
  this_week: number;
  by_day: { date: string; count: number }[];
  by_motif: { motif: string; count: number }[];
}

interface Props {
  stats?: Stats;
  loading?: boolean;
}

const items = [
  { key: "total", label: "Total RDV", icon: Calendar, accent: "text-primary bg-primary/10" },
  { key: "today", label: "Aujourd'hui", icon: Clock, accent: "text-secondary bg-secondary/15" },
  { key: "this_week", label: "Cette semaine", icon: CalendarDays, accent: "text-primary bg-primary/10" },
  { key: "urgent", label: "Urgents", icon: AlertCircle, accent: "text-destructive bg-destructive/10" },
] as const;

const StatsCards = ({ stats, loading }: Props) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map(({ key, label, icon: Icon, accent }) => (
        <Card key={key} className="p-4 shadow-card flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", accent)}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            {loading || !stats ? (
              <Skeleton className="h-6 w-12 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-foreground leading-tight">
                {stats[key as keyof Stats] as number}
              </p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;
