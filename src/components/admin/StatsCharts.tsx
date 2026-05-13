import { Card } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import type { Stats } from "./StatsCards";

interface Props {
  stats?: Stats;
  loading?: boolean;
}

const StatsCharts = ({ stats, loading }: Props) => {
  const barData =
    stats?.by_day.map((d) => ({
      date: d.date,
      label: format(parseISO(d.date), "dd/MM", { locale: fr }),
      count: d.count,
    })) ?? [];

  const pieData = stats
    ? [
        { name: "Urgent", value: stats.urgent, color: "hsl(var(--destructive))" },
        { name: "Non urgent", value: stats.non_urgent, color: "hsl(var(--secondary))" },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="grid md:grid-cols-3 gap-4 mb-6">
      <Card className="p-4 shadow-card md:col-span-2">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Rendez-vous (14 derniers jours)
        </h3>
        {loading || !stats ? (
          <Skeleton className="h-[220px] w-full" />
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-4 shadow-card">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          Répartition urgence
        </h3>
        {loading || !stats ? (
          <Skeleton className="h-[220px] w-full" />
        ) : pieData.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
            Aucune donnée
          </div>
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StatsCharts;
