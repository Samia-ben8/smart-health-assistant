import { useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API_BASE = "http://localhost:8000";

interface Slot {
  time: string;
  available: boolean;
}

interface SlotPickerProps {
  onSelect: (date: string, time: string) => void;
  disabled?: boolean;
}

const SlotPicker = ({ onSelect, disabled }: SlotPickerProps) => {
  const [date, setDate] = useState<Date | undefined>();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const dateStr = date ? format(date, "yyyy-MM-dd") : "";

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSlots([]);

    fetch(`${API_BASE}/availability?date=${dateStr}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Erreur serveur");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        // Accept multiple formats: [{time, available}], [{time}], ["09:00", ...], {slots: [...]}
        const raw = Array.isArray(data) ? data : data.slots ?? data.availability ?? [];
        const normalized: Slot[] = raw.map((s: any) => {
          if (typeof s === "string") return { time: s, available: true };
          return {
            time: s.time ?? s.hour ?? s.slot ?? "",
            available: s.available ?? s.is_available ?? (s.taken === undefined ? true : !s.taken),
          };
        }).filter((s: Slot) => s.time);
        setSlots(normalized);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Impossible de charger les créneaux");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dateStr]);

  const allUnavailable = slots.length > 0 && slots.every((s) => !s.available);

  const handlePick = (time: string) => {
    if (disabled || picked) return;
    setPicked(time);
    onSelect(dateStr, time);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-2xl p-3 space-y-3 shadow-sm"
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-10",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "EEEE d MMMM yyyy", { locale: fr }) : "Choisir une date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              setDate(d);
              setPicked(null);
            }}
            disabled={(d) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return d < today;
            }}
            initialFocus
            locale={fr}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {date && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Clock size={12} />
            <span>Créneaux disponibles</span>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="animate-spin" size={18} />
            </div>
          )}

          {error && !loading && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {!loading && !error && allUnavailable && (
            <div className="text-sm text-center text-muted-foreground bg-muted rounded-lg px-3 py-4">
              Cette date n'est pas disponible
            </div>
          )}

          {!loading && !error && !allUnavailable && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => {
                const isPicked = picked === slot.time;
                return (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && handlePick(slot.time)}
                    disabled={!slot.available || disabled || !!picked}
                    className={cn(
                      "px-3 py-2 rounded-full text-sm font-medium transition-all",
                      slot.available
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:scale-105 active:scale-95"
                        : "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60",
                      isPicked && "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-600",
                      picked && !isPicked && "opacity-40",
                    )}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          )}

          {!loading && !error && slots.length === 0 && (
            <div className="text-sm text-center text-muted-foreground bg-muted rounded-lg px-3 py-4">
              Aucun créneau pour cette date
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default SlotPicker;
