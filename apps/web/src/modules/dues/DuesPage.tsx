import React, { useState } from 'react';
import {
  CalendarCheck2,
  CalendarDays,
  Calendar,
  Layers,
  Sparkles,
  Inbox,
  AlertTriangle,
  RotateCw,
} from 'lucide-react';
import { useDuesQuery } from './dues.api';
import {
  DuesCalendarHeader,
  type DueCategoryFilter,
} from './components/DuesCalendarHeader';
import {
  DuesServicesList,
  DuesDoorstepVisitsList,
  DuesRentalsList,
  DuesOtherActivitiesList,
} from './components/DuesCategorySection';
import { Button } from '../../components/ui/Button';

// Get today's date string YYYY-MM-DD
function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const DuesPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString);
  const [activeCategory, setActiveCategory] = useState<DueCategoryFilter>('ALL');

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useDuesQuery(selectedDate);

  const summary = data?.summary || {
    totalActivities: 0,
    servicesCount: 0,
    doorstepVisitsCount: 0,
    rentalPaymentsCount: 0,
    otherActivitiesCount: 0,
  };

  // Determine which sections to display
  const showDoorstep =
    (activeCategory === 'ALL' || activeCategory === 'DOORSTEP' || activeCategory === 'SERVICES') &&
    (data?.doorstepVisits?.length ?? 0) > 0;

  const showServices =
    (activeCategory === 'ALL' || activeCategory === 'SERVICES') &&
    (data?.services?.length ?? 0) > 0;

  const showRentals =
    (activeCategory === 'ALL' || activeCategory === 'RENTALS') &&
    (data?.rentalPayments?.length ?? 0) > 0;

  const showOther =
    (activeCategory === 'ALL' || activeCategory === 'OTHER') &&
    (data?.otherActivities?.length ?? 0) > 0;

  const hasAnyVisibleRecords = showDoorstep || showServices || showRentals || showOther;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Calendar Controls */}
      <DuesCalendarHeader
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        summary={summary}
        isLoading={isLoading || isFetching}
      />

      {/* Main Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-10 text-center space-y-4">
          <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            Checking scheduled activities and dues for {selectedDate}...
          </p>
        </div>
      ) : isError ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="text-sm font-bold text-rose-900">Failed to load dues for this date</h2>
          <p className="text-xs text-rose-600 font-medium max-w-md mx-auto">
            {error instanceof Error ? error.message : 'An unexpected error occurred while querying the database.'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            leftIcon={<RotateCw className="w-3.5 h-3.5" />}
          >
            Try Again
          </Button>
        </div>
      ) : !hasAnyVisibleRecords ? (
        /* Clean Empty State Message */
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200/90 text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
            <Inbox className="w-8 h-8 text-slate-300" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-display font-bold text-slate-900">
              No dues or scheduled activities for this date.
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
              {activeCategory !== 'ALL'
                ? `There are no scheduled activities in the "${activeCategory}" category for this date. Switch to "All Activities" or choose another date.`
                : 'There are no pending services, doorstep visits, rental payment dues, or reminders scheduled for this selected date.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {activeCategory !== 'ALL' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveCategory('ALL')}
                className="text-xs"
              >
                View All Categories
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(getTodayString())}
              className="text-xs"
            >
              Go to Today
            </Button>
          </div>
        </div>
      ) : (
        /* Categorized Activity Cards */
        <div className="space-y-6">
          {showDoorstep && data?.doorstepVisits && (
            <DuesDoorstepVisitsList items={data.doorstepVisits} />
          )}

          {showServices && data?.services && (
            <DuesServicesList items={data.services} />
          )}

          {showRentals && data?.rentalPayments && (
            <DuesRentalsList items={data.rentalPayments} />
          )}

          {showOther && data?.otherActivities && (
            <DuesOtherActivitiesList items={data.otherActivities} />
          )}
        </div>
      )}
    </div>
  );
};
