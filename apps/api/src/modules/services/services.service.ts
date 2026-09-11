import { servicesRepository } from './services.repository';
import type {
  ServiceQueryFilter,
  CreateServiceInput,
  UpdateServiceInput,
  CompleteServiceInput,
} from '@crm/validation';

export class ServicesService {
  async getServices(filters: ServiceQueryFilter) {
    return servicesRepository.findPaginated(filters);
  }

  async getServiceById(id: string) {
    const service = await servicesRepository.findById(id);
    if (!service) {
      throw new Error('Service record not found');
    }
    return service;
  }

  async getHeatmap(period: 'year' | 'month' | 'week' | 'day', dateFrom?: string, dateTo?: string) {
    return servicesRepository.getHeatmapData(period, dateFrom, dateTo);
  }

  async getKPIs() {
    return servicesRepository.getKPIs();
  }

  async getUpcomingServices(days = 7) {
    return servicesRepository.getUpcomingServices(days);
  }

  async getOverdueServices() {
    return servicesRepository.getOverdueServices();
  }

  async createService(input: CreateServiceInput, createdById?: string) {
    const result = await servicesRepository.createService(input, createdById);
    try {
      const { domainEventBus } = await import('../notifications/events/event-bus');
      domainEventBus.publish(
        'SERVICE_SCHEDULED',
        'SERVICE',
        result.service.id,
        {
          serviceNumber: result.service.serviceNumber,
          customerId: result.service.customerId,
          scheduledDate: result.service.scheduledDate,
        },
        createdById
      );
    } catch (e) {
      console.error('Failed to emit SERVICE_SCHEDULED event:', e);
    }
    return result;
  }

  async updateService(id: string, input: UpdateServiceInput, actorId?: string) {
    return servicesRepository.updateService(id, input, actorId);
  }

  async cancelService(id: string, cancelReason: string, actorId?: string) {
    return servicesRepository.cancelService(id, cancelReason, actorId);
  }

  async deleteService(id: string, actorId?: string) {
    return servicesRepository.deleteService(id);
  }

  async completeService(id: string, input: CompleteServiceInput, actorId?: string) {
    const result = await servicesRepository.completeService(id, input, actorId);
    try {
      const { domainEventBus } = await import('../notifications/events/event-bus');
      domainEventBus.publish(
        'SERVICE_COMPLETED',
        'SERVICE',
        id,
        {
          serviceNumber: (result as any)?.service?.serviceNumber || 'Service',
        },
        actorId
      );

      // Trigger transactional service completion email
      import('../notifications/email.service').then(({ emailService }) => {
        emailService.sendServiceCompleted(id).catch((err) => {
          console.error('[ServicesService] Error dispatching service completed email:', err);
        });
      }).catch(() => {});
    } catch (e) {
      console.error('Failed to emit SERVICE_COMPLETED event:', e);
    }
    return result;
  }

  async listTechnicians() {
    return servicesRepository.listTechnicians();
  }

  async resendTechnicianNotification(serviceId: string, actorId?: string) {
    const service = await servicesRepository.findById(serviceId);
    if (!service) {
      const error: any = new Error('Service record not found');
      error.statusCode = 404;
      throw error;
    }
    const jobCardId = (service as any).jobCardId || (service as any).jobCard?.id;
    const { whatsappService } = await import('../whatsapp/whatsapp.service');

    if (jobCardId) {
      const res = await whatsappService.notifyTechnicianJobAssignment(jobCardId, {
        forceResend: true,
        actorUserId: actorId,
      });
      if (res.success) {
        return res;
      }
    }

    const { jobCardsRepository } = await import('../job-cards/job-cards.repository');
    const linkedCard = await jobCardsRepository.findByServiceId(serviceId);
    if (linkedCard) {
      const res = await whatsappService.notifyTechnicianJobAssignment(linkedCard.id, {
        forceResend: true,
        actorUserId: actorId,
      });
      if (res.success) {
        return res;
      }
    }

    const linkedCards = await jobCardsRepository.findPaginated({
      page: 1,
      limit: 50,
      search: service.serviceNumber,
      status: 'ALL',
      priority: 'ALL',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    const match = linkedCards.data.find((jc: any) => jc.serviceId === serviceId) || linkedCards.data[0];
    if (match) {
      const res = await whatsappService.notifyTechnicianJobAssignment(match.id, {
        forceResend: true,
        actorUserId: actorId,
      });
      if (res.success) {
        return res;
      }
    }

    // Direct fallback from authoritative service record
    return whatsappService.notifyTechnicianServiceAssignment(service, {
      forceResend: true,
      actorUserId: actorId,
    });
  }

  async resendCustomerNotification(serviceId: string, actorId?: string) {
    const service = await servicesRepository.findById(serviceId);
    if (!service) {
      const error: any = new Error('Service record not found');
      error.statusCode = 404;
      throw error;
    }
    const { whatsappService } = await import('../whatsapp/whatsapp.service');
    return whatsappService.notifyCustomerServiceScheduled(service, {
      actorUserId: actorId,
    });
  }
}

export const servicesService = new ServicesService();
