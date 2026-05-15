import { useState, useMemo, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CalendarIcon,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  LogOut,
  Lock,
  Trash2,
  Download,
} from "lucide-react";
import StatsCards, { type Stats } from "@/components/admin/StatsCards";
import StatsCharts from "@/components/admin/StatsCharts";
import AppointmentsCalendar from "@/components/admin/AppointmentsCalendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { exportToCsv } from "@/lib/csv";
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

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const API_BASE = "http://localhost:8000";
const API_URL = `${API_BASE}/appointments`;
const AUTH_KEY = "admin_authenticated";
const DEMO_EMAIL = "demo@gmail.com";
const DEMO_PASSWORD = "demo123";

interface Appointment {
  id: string | number;
  patient_name: string;
  phone: string;
  motif: string;
  urgency: string;
  date: string;
  time: string;
}

// Normalize backend variants into our Appointment shape
const normalize = (raw: any, idx: number): Appointment => {
  const rawUrgency = raw.urgency ?? raw.urgence;
  let urgency = "non_urgent";
  if (typeof rawUrgency === "boolean") {
    urgency = rawUrgency ? "urgent" : "non_urgent";
  } else if (rawUrgency != null) {
    urgency = rawUrgency.toString().toLowerCase();
  }
  return {
    id: raw.id ?? idx,
    patient_name: raw.patient_name ?? raw.name ?? raw.patient ?? "—",
    phone: raw.phone ?? raw.telephone ?? raw.tel ?? "—",
    motif: raw.motif ?? raw.reason ?? raw.subject ?? "—",
    urgency,
    date: raw.date ?? raw.appointment_date ?? "",
    time: raw.time ?? raw.heure ?? raw.appointment_time ?? "",
  };
};

const isUrgent = (u: string) => u === "urgent" || u === "urgente" || u === "high";

const fetchAppointments = async (): Promise<Appointment[]> => {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  const data = await res.json();
  const list = Array.isArray(data) ? data : data.appointments ?? [];
  return list.map(normalize);
};

const fetchStats = async (): Promise<Stats> => {
  const res = await fetch(`${API_BASE}/appointments/stats`);
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.json();
};

const deleteAppointment = async (id: string | number) => {
  const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.json();
};

const LoginScreen = ({ onSuccess }: { onSuccess: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      sessionStorage.setItem(AUTH_KEY, "1");
      toast.success("Connexion réussie");
      onSuccess();
    } else {
      setError("Email ou mot de passe incorrect");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-soft px-4">
      <Card className="w-full max-w-md p-8 shadow-card">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-hero flex items-center justify-center mb-3">
            <Lock className="text-primary-foreground" size={22} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Espace médecin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connectez-vous pour accéder au tableau de bord
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="demo@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </p>
          )}
          <Button type="submit" className="w-full bg-gradient-hero">
            Se connecter
          </Button>
          <p className="text-xs text-muted-foreground text-center pt-2">
            Démo : demo@gmail.com / demo123
          </p>
          <Link
            to="/"
            className="block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            ← Retour à l'accueil
          </Link>
        </form>
      </Card>
    </div>
  );
};

const Admin = () => {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(AUTH_KEY) === "1"
  );
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [view, setView] = useState<"calendar" | "table">("calendar");

  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["appointments"],
    queryFn: fetchAppointments,
    enabled: authed,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["appointments-stats"],
    queryFn: fetchStats,
    enabled: authed,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      toast.success("Rendez-vous annulé");
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointments-stats"] });
    },
    onError: (e: Error) => toast.error(e.message || "Échec de la suppression"),
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((a) => {
      if (urgencyFilter === "urgent" && !isUrgent(a.urgency)) return false;
      if (urgencyFilter === "non_urgent" && isUrgent(a.urgency)) return false;
      if (dateFilter) {
        const target = format(dateFilter, "yyyy-MM-dd");
        const apptDate = a.date?.slice(0, 10);
        if (apptDate !== target) return false;
      }
      return true;
    });
  }, [data, urgencyFilter, dateFilter]);

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    setAuthed(false);
  };

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.info("Aucun rendez-vous à exporter");
      return;
    }
    const rows = filtered.map((a) => ({
      Patient: a.patient_name,
      Téléphone: a.phone,
      Motif: a.motif,
      Urgence: isUrgent(a.urgency) ? "Urgent" : "Non urgent",
      Date: a.date,
      Heure: a.time,
    }));
    exportToCsv(rows, `rendez-vous-${format(new Date(), "yyyy-MM-dd")}.csv`);
    toast.success(`${rows.length} rendez-vous exporté${rows.length > 1 ? "s" : ""}`);
  };

  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft size={16} /> Accueil
            </Link>
            <div className="hidden sm:block w-px h-6 bg-border" />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Tableau de bord
              </h1>
              <p className="text-xs text-muted-foreground">
                Gestion des rendez-vous patients
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut size={16} /> Déconnexion
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <StatsCards stats={stats} loading={statsLoading} />
        <StatsCharts stats={stats} loading={statsLoading} />

        {/* View toggle */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <Tabs value={view} onValueChange={(v) => setView(v as "calendar" | "table")}>
            <TabsList>
              <TabsTrigger value="calendar">
                <CalendarIcon size={14} className="mr-1.5" />
                Calendrier
              </TabsTrigger>
              <TabsTrigger value="table">Tous les RDV</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={(view === "table" ? filtered.length : data?.length ?? 0) === 0}
            >
              <Download size={14} />
              Exporter CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw size={14} className={cn(isFetching && "animate-spin")} />
              Actualiser
            </Button>
          </div>
        </div>

        {view === "calendar" && (
          <AppointmentsCalendar
            appointments={data ?? []}
            onDelete={(id) => deleteMutation.mutate(id)}
            isDeleting={deleteMutation.isPending}
          />
        )}

        {view === "table" && (
          <>
        {/* Filters */}
        <Card className="p-4 mb-6 shadow-card">
          <div className="flex flex-col md:flex-row md:items-end gap-4 flex-wrap">
            <div className="flex flex-col gap-1.5 min-w-[180px]">
              <Label className="text-xs text-muted-foreground">Urgence</Label>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="non_urgent">Non urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon size={16} />
                    {dateFilter
                      ? format(dateFilter, "dd MMM yyyy", { locale: fr })
                      : "Toutes les dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={setDateFilter}
                    initialFocus
                    locale={fr}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {(urgencyFilter !== "all" || dateFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUrgencyFilter("all");
                  setDateFilter(undefined);
                }}
              >
                Réinitialiser
              </Button>
            )}

            <div className="md:ml-auto flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Patient</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Urgence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Heure</TableHead>
                  <TableHead className="w-[60px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                {isError && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle className="text-destructive" size={32} />
                        <div>
                          <p className="font-medium text-foreground">
                            Impossible de charger les rendez-vous
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {(error as Error)?.message ?? "Erreur inconnue"} —
                            vérifiez que le backend est accessible sur{" "}
                            <code className="text-xs">{API_URL}</code>
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => refetch()}>
                          Réessayer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading && !isError && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      Aucun rendez-vous trouvé
                    </TableCell>
                  </TableRow>
                )}

                {!isLoading &&
                  !isError &&
                  filtered.map((a) => {
                    const urgent = isUrgent(a.urgency);
                    let displayDate = a.date;
                    let isDone = false;
                    try {
                      if (a.date) {
                        const d = new Date(a.date);
                        displayDate = format(d, "dd MMM yyyy", { locale: fr });
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        isDone = dDay < today;
                      }
                    } catch {
                      /* keep raw */
                    }
                    return (
                      <TableRow key={a.id} className={cn(isDone && "opacity-70")}>
                        <TableCell className="font-medium">{a.patient_name}</TableCell>
                        <TableCell className="text-muted-foreground">{a.phone}</TableCell>
                        <TableCell className="max-w-[260px] truncate">{a.motif}</TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell>{displayDate}</TableCell>
                        <TableCell>{a.time}</TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                disabled={deleteMutation.isPending}
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
                                  {displayDate} à {a.time} sera supprimé définitivement.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Retour</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteMutation.mutate(a.id)}
                                >
                                  Confirmer l'annulation
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Admin;
