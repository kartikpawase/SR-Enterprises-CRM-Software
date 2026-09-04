import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Sparkles,
  Layers,
  Wrench,
  Home,
  Repeat,
  BellRing,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useDuesMonthSummaryQuery } from '../dues.api';
import { cn } from '../../../lib/utils';

export type DueCategoryFilter = 'ALL' | 'SERVICES' | 'DOORSTEP' | 'RENTALS' | 'OTHER';

interface DuesCalendarHeaderProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (newDate: string) => void;
  activeCategory: DueCategoryFilter;
  onCategoryChange: (category: DueCategoryFilter) => void;
  summary?: {
    totalActivities: number;
    servicesCount: number;
    doorstepVisitsCount: number;
    rentalPaymentsCount: number;
    otherActivitiesCount: number;
  };
  isLoading?: boolean;
}

export const DuesCalendarHeader: React.FC<DuesCalendarHeaderProps> = ({
  selectedDate,
  onDateChange,
  activeCategory,
  onCategoryChange,
  summary = {
    totalActivities: 0,
    servicesCount: 0,
    doorstepVisitsCount: 0,
    rentalPaymentsCount: 0,
    otherActivitiesCount: 0,
  },
  isLoading = false,
}) => {
  const [showMonthCalendar, setShowMonthCalendar] = useState(false);

  // Parse current date parts safely
  const [yearStr, monthStr, dayStr] = selectedDate.split('-');
  const currentYear = parseInt(yearStr, 10);
  const currentMonth = parseInt(monthStr, 10);
  const currentDay = parseInt(dayStr, 10);

  const [calendarViewYear, setCalendarViewYear] = useState(currentYear);
  const [calendarViewMonth, setCalendarViewMonth] = useState(currentMonth);

  // Fetch month summary for calendar indicators
  const { data: monthData } = useDuesMonthSummaryQuery(calendarViewYear, calendarViewMonth);
  const dateCounts = monthData?.counts || {};

  // Formatted date string (e.g. "Sunday, 15 Aug 2027")
  const formattedFullDate = React.useMemo(() => {
    try {
      const d = new Date(currentYear, currentMonth - 1, currentDay);
      return d.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return selectedDate;
    }
  }, [currentYear, currentMonth, currentDay, selectedDate]);

  // Compute today's date in YYYY-MM-DD
  const todayStr = React.useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const isToday = selectedDate === todayStr;

  // Day shift helper
  const shiftDay = (days: number) => {
    const d = new Date(currentYear, currentMonth - 1, currentDay);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    onDateChange(`${y}-${m}-${day}`);
  };

  // Month navigation in calendar popup
  const shiftMonth = (offset: number) => {
    let nextM = calendarViewMonth + offset;
    let nextY = calendarViewYear;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    } else if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    setCalendarViewMonth(nextM);
    setCalendarViewYear(nextY);
  };

  // Build grid days for calendarViewYear & calendarViewMonth
  const daysInMonth = new Date(calendarViewYear, calendarViewMonth, 0).getDate();
  const firstDayWeekday = new Date(calendarViewYear, calendarViewMonth - 1, 1).getDay(); // 0 is Sunday
  const monthName = new Date(calendarViewYear, calendarViewMonth - 1, 1).toLocaleString('en-IN', {
    month: 'long',
  });

  return (
    <div className="space-y-4">
      {/* Top Main Date Controller Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Date Display & Title */}
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-700 border border-primary-100 flex items-center justify-center shrink-0 shadow-2xs">
              <CalendarIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 tracking-tight">
                  {formattedFullDate}
                </h1>
                {isToday && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-sky-50 text-sky-700 border border-sky-200">
                    <Sparkles className="w-2.5 h-2.5 text-sky-600" /> Today
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isLoading ? (
                  'Fetching scheduled activities...'
                ) : summary.totalActivities > 0 ? (
                  <>
                    <span className="font-bold text-slate-900">{summary.totalActivities}</span> activities
                    scheduled or due on this date
                  </>
                ) : (
                  'No activities or dues scheduled for this date'
                )}
              </p>
            </div>
          </div>

          {/* Right: Date Navigation & Calendar Picker Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Quick Previous Day Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => shiftDay(-1)}
              aria-label="Previous Day"
              className="px-2.5 h-9"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Jump to Today Button */}
            <Button
              type="button"
              variant={isToday ? 'primary' : 'outline'}
              size="sm"
              onClick={() => onDateChange(todayStr)}
              className="h-9 px-3 text-xs font-semibold"
            >
              Today
            </Button>

            {/* Quick Next Day Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => shiftDay(1)}
              aria-label="Next Day"
              className="px-2.5 h-9"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>

            {/* Native HTML5 Date Picker Input */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) {
                    onDateChange(e.target.value);
                    const [y, m] = e.target.value.split('-');
                    setCalendarViewYear(parseInt(y, 10));
                    setCalendarViewMonth(parseInt(m, 10));
                  }
                }}
                className="h-9 px-3 text-xs font-mono font-medium text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition-all cursor-pointer"
                aria-label="Select Date from Calendar"
              />
            </div>

            {/* Month Calendar Grid Toggle */}
            <Button
              type="button"
              variant={showMonthCalendar ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowMonthCalendar(!showMonthCalendar)}
              leftIcon={<CalendarDays className="w-4 h-4 text-slate-600" />}
              className="h-9 text-xs"
            >
              {showMonthCalendar ? 'Hide Calendar' : 'Month View'}
            </Button>
          </div>
        </div>

        {/* Expandable Month Calendar View */}
        {showMonthCalendar && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-fast">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                {monthName} {calendarViewYear}
              </h3>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => shiftMonth(-1)}
                  className="w-7 h-7 p-0"
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => shiftMonth(1)}
                  className="w-7 h-7 p-0"
                  aria-label="Next Month"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Calendar Day Grid */}
            <div className="grid grid-cols-7 gap-1 text-center select-none">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {d}
                </div>
              ))}

              {/* Leading Empty Slots */}
              {Array.from({ length: firstDayWeekday }).map((_, i) => (
                <div key={`empty-${i}`} className="h-9" />
              ))}

              {/* Days of Month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dStr = `${calendarViewYear}-${String(calendarViewMonth).padStart(2, '0')}-${String(
                  dayNum
                ).padStart(2, '0')}`;
                const isSelected = dStr === selectedDate;
                const isCurrentToday = dStr === todayStr;
                const count = dateCounts[dStr] || 0;

                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => onDateChange(dStr)}
                    className={cn(
                      'h-9 rounded-lg flex flex-col items-center justify-center relative transition-all text-xs font-semibold cursor-pointer',
                      isSelected
                        ? 'bg-primary-600 text-white shadow-sm font-bold'
                        : isCurrentToday
                        ? 'bg-sky-50 text-sky-700 font-bold border border-sky-200'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                    )}
                  >
                    <span>{dayNum}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full mt-0.5',
                          isSelected ? 'bg-white' : 'bg-emerald-500'
                        )}
                        title={`${count} activities`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Category Filter Pills Row */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 select-none">
        <button
          type="button"
          onClick={() => onCategoryChange('ALL')}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border',
            activeCategory === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Activities</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-extrabold',
              activeCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {summary.totalActivities}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onCategoryChange('SERVICES')}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border',
            activeCategory === 'SERVICES'
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
          )}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Services</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-extrabold',
              activeCategory === 'SERVICES' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {summary.servicesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onCategoryChange('DOORSTEP')}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border',
            activeCategory === 'DOORSTEP'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
          )}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Doorstep Visits</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-extrabold',
              activeCategory === 'DOORSTEP' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {summary.doorstepVisitsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onCategoryChange('RENTALS')}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border',
            activeCategory === 'RENTALS'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
          )}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span>Rental Payments</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-extrabold',
              activeCategory === 'RENTALS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {summary.rentalPaymentsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onCategoryChange('OTHER')}
          className={cn(
            'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border',
            activeCategory === 'OTHER'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
          )}
        >
          <BellRing className="w-3.5 h-3.5" />
          <span>Other Scheduled Activities</span>
          <span
            className={cn(
              'px-1.5 py-0.2 rounded-full text-[10px] font-extrabold',
              activeCategory === 'OTHER' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            )}
          >
            {summary.otherActivitiesCount}
          </span>
        </button>
      </div>
    </div>
  );
};
