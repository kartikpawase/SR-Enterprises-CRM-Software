import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { TodaysScheduleCard } from './TodaysScheduleCard';
import type { ScheduleAppointment } from '../types';

describe('TodaysScheduleCard Component', () => {
  const sampleSchedule: ScheduleAppointment[] = [
    {
      id: 'SCH-001',
      time: '11:00 AM',
      customerName: 'Customer General Normal',
      serviceName: 'General Filter Check',
      mode: 'Doorstep',
      category: 'General',
      priority: 'NORMAL',
      status: 'Scheduled',
    },
    {
      id: 'SCH-002',
      time: '09:00 AM',
      customerName: 'Customer Emergency Urgent',
      serviceName: 'Water Leak Emergency',
      mode: 'Doorstep',
      category: 'Emergency',
      priority: 'URGENT',
      status: 'Scheduled',
    },
    {
      id: 'SCH-003',
      time: '08:00 AM',
      customerName: 'Customer Completed Done',
      serviceName: 'Done Early Morning',
      mode: 'Doorstep',
      category: 'Emergency',
      priority: 'URGENT',
      status: 'Completed',
    },
    {
      id: 'SCH-004',
      time: '10:30 AM',
      customerName: 'Customer High Priority',
      serviceName: 'Membrane Replacement',
      mode: 'In-Shop',
      category: 'High',
      priority: 'HIGH',
      status: 'In Progress',
    },
  ];

  it('renders title and view calendar action', () => {
    render(
      <BrowserRouter>
        <TodaysScheduleCard schedule={sampleSchedule} />
      </BrowserRouter>
    );

    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    expect(screen.getByText('View Calendar')).toBeInTheDocument();
  });

  it('orders appointments on priority basis with Emergency at the top and Completed at the bottom', () => {
    const { container } = render(
      <BrowserRouter>
        <TodaysScheduleCard schedule={sampleSchedule} />
      </BrowserRouter>
    );

    const customerNames = Array.from(container.querySelectorAll('h3')).map((el) => el.textContent);
    
    // Top: Customer Emergency Urgent (URGENT)
    // 2nd: Customer High Priority (HIGH)
    // 3rd: Customer General Normal (NORMAL)
    // Bottom: Customer Completed Done (Completed)
    expect(customerNames[0]).toBe('Customer Emergency Urgent');
    expect(customerNames[1]).toBe('Customer High Priority');
    expect(customerNames[2]).toBe('Customer General Normal');
    expect(customerNames[3]).toBe('Customer Completed Done');
  });

  it('displays "Completed" badge and low opacity visibility for completed services', () => {
    const { container } = render(
      <BrowserRouter>
        <TodaysScheduleCard schedule={sampleSchedule} />
      </BrowserRouter>
    );

    // Completed badge is rendered
    expect(screen.getByText('Completed')).toBeInTheDocument();

    // The completed item container has opacity class for lower visibility
    const completedHeading = screen.getByText('Customer Completed Done');
    const itemContainer = completedHeading.closest('.cursor-pointer');
    expect(itemContainer?.className).toContain('opacity-70');
  });
});
