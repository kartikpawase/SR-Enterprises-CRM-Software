import React from 'react';

export const ReportSkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* 5 KPI Skeletons */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-3.5 select-none">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 h-28 flex flex-col justify-between last:col-span-2 sm:last:col-span-1">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100" />
              <div className="space-y-1.5 text-right">
                <div className="w-16 h-3 bg-slate-100 rounded ml-auto" />
                <div className="w-20 sm:w-24 h-5 bg-slate-200 rounded ml-auto" />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div className="w-16 h-3 bg-slate-100 rounded" />
              <div className="w-12 h-3 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Chart 2-Column Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-5 h-80 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="space-y-1.5">
              <div className="w-40 h-4 bg-slate-200 rounded" />
              <div className="w-56 h-3 bg-slate-100 rounded" />
            </div>
            <div className="w-32 h-7 bg-slate-100 rounded" />
          </div>
          <div className="h-52 bg-slate-50/70 rounded-lg" />
        </div>

        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 h-80 flex flex-col justify-between">
          <div className="space-y-1.5 pb-3 border-b border-slate-100">
            <div className="w-36 h-4 bg-slate-200 rounded" />
            <div className="w-28 h-3 bg-slate-100 rounded" />
          </div>
          <div className="space-y-2.5">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="w-full h-10 bg-slate-50 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
