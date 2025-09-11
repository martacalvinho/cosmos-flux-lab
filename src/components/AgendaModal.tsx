import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin, ExternalLink, List, Grid3X3, Sparkles, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, isSameDay, parseISO, addDays, compareAsc, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, addMonths } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface AgendaModalProps {
  children: React.ReactNode; // trigger
}

interface EventItem {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string; // ISO
  end: string;   // ISO
  htmlLink?: string;
  calendarType?: string; // cosmos_hub | cosmos_ecosystem
}

const API_URL = "https://cosmos-events-dashboard.onrender.com/api/events";

const AgendaModal: React.FC<AgendaModalProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [viewMode, setViewMode] = useState<"cards" | "list" | "calendar">("cards");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetch(API_URL)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: EventItem[]) => {
        // sort by start ascending and keep next 200 only
        const sorted = [...data].sort((a, b) => compareAsc(parseISO(a.start), parseISO(b.start))).slice(0, 200);
        setEvents(sorted);
      })
      .catch((e) => setError(e?.message ?? "Failed to load events"))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const now = new Date();
  const eventsForSelected = useMemo(
    () => events.filter((e) => isSameDay(parseISO(e.start), selectedDate)),
    [events, selectedDate]
  );
  const eventsNextOfSelected = useMemo(
    () => events.filter((e) => isSameDay(parseISO(e.start), addDays(selectedDate, 1))),
    [events, selectedDate]
  );

  const renderEventCard = (e: EventItem) => {
    const start = parseISO(e.start);
    const end = parseISO(e.end);
    return (
      <Card key={e.id} className="p-4 bg-surface border-border">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm md:text-base">{e.summary}</h4>
              {e.calendarType && (
                <Badge variant="outline" className="text-xs">
                  {e.calendarType?.includes("hub") ? "Hub" : "Ecosystem"}
                </Badge>
              )}
            </div>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                <span>{format(start, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>
                  {format(start, "p")} – {format(end, "p")}
                </span>
              </div>
              {e.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{e.location}</span>
                </div>
              )}
            </div>
            {e.description && (
              <p className="mt-3 text-sm leading-relaxed line-clamp-3" dangerouslySetInnerHTML={{ __html: e.description }} />
            )}
          </div>
          <div>
            {e.htmlLink && (
              <a
                href={e.htmlLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
                aria-label="Open event"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderList = () => {
    return (
      <div className="space-y-6">
        {[{ label: format(selectedDate, "eeee, MMM d"), data: eventsForSelected }, { label: `${format(addDays(selectedDate, 1), "eeee, MMM d")} (Next)`, data: eventsNextOfSelected }].map((group) => (
          <div key={group.label}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{group.label}</div>
            {group.data.length === 0 ? (
              <div className="text-sm text-muted-foreground">No events.</div>
            ) : (
              <div className="space-y-3">
                {group.data.map((e) => (
                  <div key={e.id} className="flex items-start justify-between gap-3 border-b border-border/50 py-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{e.summary}</span>
                        {e.calendarType && (
                          <Badge variant="outline" className="text-xs">
                            {e.calendarType?.includes("hub") ? "Hub" : "Ecosystem"}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(e.start), "EEE, MMM d p")} – {format(parseISO(e.end), "p")} • {e.location || ""}
                      </div>
                    </div>
                    {e.htmlLink && (
                      <a href={e.htmlLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
      days.push(d);
    }

    const eventsByDay = (d: Date) => events.filter((e) => isSameDay(parseISO(e.start), d)).slice(0, 3);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">{format(selectedDate, "MMMM yyyy")}</div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setSelectedDate(addMonths(selectedDate, -1))} aria-label="Previous month">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setSelectedDate(addMonths(selectedDate, 1))} aria-label="Next month">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
            <div key={d} className="py-1 text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const inMonth = isSameMonth(d, selectedDate);
            const isSelected = isSameDay(d, selectedDate);
            const evs = eventsByDay(d);
            return (
              <button
                key={d.toISOString()}
                onClick={() => setSelectedDate(new Date(d))}
                className={`text-left p-2 rounded-md border ${isSelected ? 'border-primary bg-primary/10' : 'border-border'} ${inMonth ? '' : 'opacity-50'} hover:bg-hover transition`}
              >
                <div className="text-xs font-medium">{format(d, 'd')}</div>
                <div className="mt-1 flex flex-col gap-1">
                  {evs.map((e) => (
                    <div key={e.id} className="h-1.5 rounded-full bg-primary/70" title={e.summary} />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
        {/* Selected day events below grid */}
        <div className="mt-4">
          <div className="text-sm font-medium mb-2">Events on {format(selectedDate, "EEEE, MMMM d, yyyy")}</div>
          {eventsForSelected.length === 0 ? (
            <div className="text-sm text-muted-foreground">No events on this day.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {eventsForSelected.map((e) => renderEventCard(e))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent noTransformCenter overlayClassName="z-0 pointer-events-none" className="z-10 max-w-3xl bg-card border-border p-0 overflow-visible shadow-modal sm:rounded-lg">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-center text-xl font-semibold flex items-center justify-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Cosmos Agenda
            <Badge variant="outline" className="text-xs ml-2">Beta</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Bot notice */}
        <div className="px-6">
          <Card className="p-3 mb-4 bg-primary/10 border-primary/20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium">Stay updated with all Cosmos events!</div>
                  <div className="mt-1">
                    Add our Telegram bot <a className="text-primary hover:underline font-medium" href="https://t.me/cosmicagenda_bot" target="_blank" rel="noreferrer">@cosmicagenda_bot</a>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowMoreInfo((v) => !v)}>{showMoreInfo ? 'Less' : 'More'}</Button>
            </div>
          </Card>
          {/* Collapsible sections, toggled by More */}
          {showMoreInfo && (
          <Accordion type="multiple" className="mb-4">
            <AccordionItem value="getting-started">
              <AccordionTrigger>Getting Started</AccordionTrigger>
              <AccordionContent>
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  <li>Search for the bot: Open Telegram and search for <a className="text-primary hover:underline" href="https://t.me/cosmicagenda_bot" target="_blank" rel="noreferrer">@cosmicagenda_bot</a></li>
                  <li>Start the bot: Send the <code>/start</code> command to initiate the bot</li>
                  <li>Set your preferences: Choose Hub, Ecosystem, or both</li>
                  <li>Enjoy timely updates: Receive notifications directly in Telegram</li>
                </ol>
                <p className="mt-3 text-xs text-muted-foreground">Tip: Add the bot to your Telegram groups to keep your community updated about Cosmos events!</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="bot-commands">
              <AccordionTrigger>Bot Commands</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li><code>/events</code> – List upcoming events for the next 7 days</li>
                  <li><code>/month</code> – Show all events for the current month</li>
                  <li><code>/hub</code> – Show only Cosmos Hub events</li>
                  <li><code>/ecosystem</code> – Show only Cosmos Ecosystem events</li>
                  <li><code>/remind</code> – Set up custom reminders for specific events</li>
                  <li><code>/help</code> – Show all available commands</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="benefits">
              <AccordionTrigger>Benefits</AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Real-time notifications for upcoming events</li>
                  <li>Customizable alerts based on your preferences</li>
                  <li>Quick access to event details and links</li>
                  <li>Easily add events to your calendar from Telegram</li>
                  <li>Never miss important Cosmos community gatherings</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          )}
        </div>

        {/* Controls */}
        <div className="px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={() => setSelectedDate(addDays(selectedDate, -1))} aria-label="Previous day">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-2 text-sm font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</div>
            <Button size="icon" variant="outline" onClick={() => setSelectedDate(addDays(selectedDate, 1))} aria-label="Next day">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={viewMode === "cards" ? "default" : "outline"} onClick={() => setViewMode("cards")} className="gap-2"><Grid3X3 className="w-4 h-4" /> Cards</Button>
            <Button size="sm" variant={viewMode === "list" ? "default" : "outline"} onClick={() => setViewMode("list")} className="gap-2"><List className="w-4 h-4" /> List</Button>
            <Button size="sm" variant={viewMode === "calendar" ? "default" : "outline"} onClick={() => setViewMode("calendar")} className="gap-2"><Calendar className="w-4 h-4" /> Calendar</Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading events…</div>
          ) : error ? (
            <div className="text-sm text-destructive">Failed to load events: {error}</div>
          ) : viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {eventsForSelected.length === 0 ? (
                <div className="text-sm text-muted-foreground">No events on this day.</div>
              ) : (
                eventsForSelected.map((e) => renderEventCard(e))
              )}
            </div>
          ) : viewMode === "list" ? (
            renderList()
          ) : (
            renderCalendar()
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AgendaModal;
