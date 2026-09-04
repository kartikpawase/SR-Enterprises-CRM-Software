import { jobCardsRepository } from './job-cards.repository';
import { notificationsService } from '../notifications/notifications.service';
import type {
  JobCardQueryFilter,
  CreateJobCardInput,
  AssignTechnicianInput,
  UpdateJobCardWorkInput,
  CompleteJobCardInput,
  JobCardActionInput,
} from '@crm/validation';

export interface UserContext {
  id?: string;
  userId?: string;
  role?: string;
}

export class JobCardsService {
  /**
   * Enforces object-level authorization (IDOR protection) for field technicians.
   * Super Admins, Admins, and Staff can access all jobs.
   * Technicians can only access and modify job cards assigned directly to them.
   */
  private assertJobCardAccess(jobCard: any, user?: UserContext): void {
    if (!user) return;
    const userRole = user.role;
    const userId = user.userId || user.id;

    if (userRole === 'Technician' && userId) {
      const assignedTechId = jobCard.technicianId || jobCard.assignedTechnicianId;
      if (assignedTechId && assignedTechId !== userId) {
        const error = new Error('Access denied: You are not authorized to view or modify this job card.');
        (error as any).statusCode = 403;
        (error as any).code = 'FORBIDDEN';
        throw error;
      }
    }
  }

  async getJobCards(filters: JobCardQueryFilter) {
    return jobCardsRepository.findPaginated(filters);
  }

  async getJobCardById(id: string, user?: UserContext) {
    const jobCard = await jobCardsRepository.findById(id);
    if (!jobCard) {
      const error = new Error('Job Card record not found');
      (error as any).statusCode = 404;
      (error as any).code = 'NOT_FOUND';
      throw error;
    }
    this.assertJobCardAccess(jobCard, user);
    return jobCard;
  }

  async getKPIs() {
    return jobCardsRepository.getKPIs();
  }

  async createJobCard(input: CreateJobCardInput, actorId?: string) {
    return jobCardsRepository.createJobCard(input, actorId);
  }

  async assignTechnician(id: string, input: AssignTechnicianInput, actorId?: string) {
    const jobCard = await jobCardsRepository.assignTechnician(id, input, actorId);
    try {
      if (jobCard && input.technicianId) {
        await notificationsService.dispatchJobAssigned({
          jobCardId: jobCard.id,
          jobCardNumber: jobCard.jobCardNumber,
          technicianId: input.technicianId,
          customerName: (jobCard as any).customer?.fullName || (jobCard as any).customerName || 'Customer',
          serviceType: (jobCard as any).service?.serviceType || (jobCard as any).serviceType || 'Service',
        });
      }
    } catch {
      // Non-blocking in-app notification dispatch
    }

    // Non-blocking WhatsApp notification dispatch to assigned technician
    try {
      if (jobCard && input.technicianId) {
        const { whatsappService } = await import('../whatsapp/whatsapp.service');
        await whatsappService.notifyTechnicianJobAssignment(jobCard.id, {
          actorUserId: actorId,
        });
      }
    } catch (err) {
      // WhatsApp is a secondary notification channel - never roll back assignment
      console.error('[JobCardsService] Error dispatching WhatsApp notification on assignment:', err);
    }

    return jobCard;
  }

  async resendTechnicianNotification(id: string, user?: UserContext) {
    const jobCard = await jobCardsRepository.findById(id);
    if (!jobCard) {
      const error = new Error('Job Card record not found');
      (error as any).statusCode = 404;
      (error as any).code = 'NOT_FOUND';
      throw error;
    }
    this.assertJobCardAccess(jobCard, user);

    const actorId = user ? (user.userId || user.id) : undefined;
    const { whatsappService } = await import('../whatsapp/whatsapp.service');
    return whatsappService.notifyTechnicianJobAssignment(id, {
      forceResend: true,
      actorUserId: actorId,
    });
  }

  async performWorkflowAction(id: string, actionInput: JobCardActionInput, user?: UserContext) {
    const jobCard = await jobCardsRepository.findById(id);
    if (!jobCard) {
      const error = new Error('Job Card record not found');
      (error as any).statusCode = 404;
      (error as any).code = 'NOT_FOUND';
      throw error;
    }
    this.assertJobCardAccess(jobCard, user);

    const actorId = user ? (user.userId || user.id) : undefined;
    return jobCardsRepository.performWorkflowAction(id, actionInput, actorId);
  }

  async updateWork(id: string, input: UpdateJobCardWorkInput, user?: UserContext) {
    const jobCard = await jobCardsRepository.findById(id);
    if (!jobCard) {
      const error = new Error('Job Card record not found');
      (error as any).statusCode = 404;
      (error as any).code = 'NOT_FOUND';
      throw error;
    }
    this.assertJobCardAccess(jobCard, user);

    const actorId = user ? (user.userId || user.id) : undefined;
    return jobCardsRepository.updateWork(id, input, actorId);
  }

  async completeJobCard(id: string, input: CompleteJobCardInput, user?: UserContext) {
    const jobCard = await jobCardsRepository.findById(id);
    if (!jobCard) {
      const error = new Error('Job Card record not found');
      (error as any).statusCode = 404;
      (error as any).code = 'NOT_FOUND';
      throw error;
    }
    this.assertJobCardAccess(jobCard, user);

    const actorId = user ? (user.userId || user.id) : undefined;
    const result = await jobCardsRepository.completeJobCard(id, input, actorId);
    try {
      if (result?.jobCard) {
        await notificationsService.dispatchJobCompleted({
          jobCardId: result.jobCard.id,
          jobCardNumber: result.jobCard.jobCardNumber,
          technicianName: 'Technician',
          customerName: 'Customer',
        });
      }
    } catch {
      // Non-blocking notification dispatch
    }
    return result;
  }
}

export const jobCardsService = new JobCardsService();
