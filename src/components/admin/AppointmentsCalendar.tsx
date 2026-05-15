import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Trash2, CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface CalendarAppointment {
  id: string | number;
  patient_name: string;
  phone: string;
  motif: string;
  urgency: string;
  date: string;
  time: string;
}

interface Props {
  appointments: CalendarAppointment[];
  onDelete: (id: string | number) => void;
  isDeleting?: boolean;
}

const isUrgent = (u: string) =>
  u === "urgent" || u === "urgente" || u === "high";

const safeParse = (d: string): Date | null => {
  try {
    if (!d) return null;
    const dt = d.length <= 10 ? parseISO(d) : new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  } catch {
    return null;
  }
};

const AppointmentsCalendar = ({ appointments, onDelete, isDeleting }: Props) => {
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date>(new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const a of appointments) {
      const dt = safeParse(a.date);
      if (!dt) continue;
      const key = format(dt, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [appointments]);

  const dayAppointments = useMemo(() => {
    const key = format(selected, "yyyy-MM-dd");
    const list = byDay.get(key) ?? [];
    return [...list].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [byDay, selected]);

  return (
    <Card className="p-4 md:p-6 shadow-card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays size={18} className="text-primary" />
          Calendrier des rendez-vous
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const today = new Date();
            setMonth(today);
            setSelected(today);
          }}
        >
          Aujourd'hui
        </Button>
      </div>

      <DayPicker
        mode="single"
        selected={selected}
        onSelect={(d) => d && setSelected(d)}
        month={month}
        onMonthChange={setMonth}
        locale={fr}
        showOutsideDays
        className="p-0 pointer-events-auto w-full"
        classNames={{
          months: "flex flex-col w-full",
          month: "space-y-4 w-full",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-base font-semibold capitalize",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse",
          head_row: "flex w-full",
          head_cell:
            "text-muted-foreground rounded-md flex-1 font-medium text-xs uppercase py-2",
          row: "flex w-full mt-1",
          cell: "flex-1 h-20 md:h-24 text-center text-sm p-0 relative border border-border/40 [&:has([aria-selected])]:bg-accent/40",
          day: cn(
            "h-full w-full p-1 font-normal hover:bg-accent/60 rounded-none flex flex-col items-start justify-start gap-1 transition-colors"
          ),
          day_selected:
            "!bg-primary/15 !text-foreground border-2 border-primary",
          day_today: "bg-secondary/20 font-bold text-secondary-foreground",
          day_outside: "text-muted-foreground/40",
          day_disabled: "text-muted-foreground opacity-50",
          day_hidden: "invisible",
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-4 w-4" />,
          IconRight: () => <ChevronRight className="h-4 w-4" />,
          DayContent: ({ date }) => {
            const key = format(date, "yyyy-MM-dd");
            const list = byDay.get(key) ?? [];
            const urgentCount = list.filter((a) => isUrgent(a.urgency)).length;
            const normalCount = list.length - urgentCount;
            const today = isSameDay(date, new Date());
            return (
              <div className="flex flex-col items-start w-full h-full">
                <span
                  className={cn(
                    "text-xs md:text-sm font-medium",
                    today && "text-primary font-bold"
                  )}
                >
                  {format(date, "d")}
                </span>
                {list.length > 0 && (
                  <div className="mt-auto w-full flex flex-wrap gap-0.5 px-0.5 pb-0.5">
                    {urgentCount > 0 && (
                      <span className="text-[10px] px-1 rounded bg-destructive/15 text-destructive font-medium">
                        {urgentCount} urg.
                      </span>
                    )}
                    {normalCount > 0 && (
                      <span className="text-[10px] px-1 rounded bg-secondary/20 text-secondary-foreground font-medium">
                        {normalCount}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          },
        }}
      />

      <div className="mt-6 border-t border-border pt-4">
        <h3 className="font-semibold text-foreground mb-3 capitalize">
          {format(selected, "EEEE d MMMM yyyy", { locale: fr })}
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({dayAppointments.length} rendez-vous)
          </span>
        </h3>

        {dayAppointments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucun rendez-vous ce jour
          </p>
        ) : (
          <ul className="space-y-2">
            {dayAppointments.map((a) => {
              const urgent = isUrgent(a.urgency);
              const apptDate = safeParse(a.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const isDone = apptDate
                ? new Date(apptDate.getFullYear(), apptDate.getMonth(), apptDate.getDate()) < today
                : false;
              return (
                <li
                  key={a.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors",
                    isDone && "opacity-70"
                  )}
                >
                  <div className="text-sm font-mono font-semibold text-primary min-w-[55px]">
                    {a.time || "--:--"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {a.patient_name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {a.motif} · {a.phone}
                    </div>
                  </div>
                  {isDone ? (
                    <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                      Done
                    </Badge>
                  ) : urgent ? (
                    <Badge variant="destructive">Urgent</Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-secondary/15 text-secondary hover:bg-secondary/20"
                    >
                      Non urgent
                    </Badge>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={isDeleting}
                        aria-label="Annuler le rendez-vous"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Annuler ce rendez-vous ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Le rendez-vous de <strong>{a.patient_name}</strong> du{" "}
                          {format(selected, "dd MMM yyyy", { locale: fr })} à {a.time} sera
                          supprimé définitivement.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Retour</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => onDelete(a.id)}
                        >
                          Confirmer l'annulation
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
};

export default AppointmentsCalendar;
