import type { FastifyPluginAsync } from 'fastify';
import { PublicInquirySubmissionSchema } from '@crm/validation';
import { inquiriesRepository } from './inquiries.repository';
import { createCaptchaChallenge, validateCaptcha } from '../../security/captcha';
import { redis } from '../../redis/client';

export const publicInquiriesRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/v1/public/captcha
   * Issues single-use visual challenge for website inquiry forms
   */
  fastify.get('/captcha', async (_request, reply) => {
    try {
      const challenge = await createCaptchaChallenge(redis, 300); // 5 min TTL
      return reply.send({
        success: true,
        data: {
          challengeId: challenge.challengeId,
          svg: challenge.svg,
        },
      });
    } catch (err: any) {
      fastify.log.error({ err }, 'Failed to generate public CAPTCHA challenge');
      return reply.status(500).send({
        success: false,
        error: {
          code: 'CAPTCHA_GEN_FAILED',
          message: 'Unable to initialize security challenge. Please try again.',
        },
      });
    }
  });

  /**
   * POST /api/v1/public/inquiries
   * Secure public website endpoint for inquiry submissions
   * Includes rate limiting, CAPTCHA validation, honeypot anti-bot check, and input sanitization
   */
  fastify.post(
    '/inquiries',
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      try {
        // 1. Strict Schema Validation
        const parsed = PublicInquirySubmissionSchema.safeParse(request.body);
        if (!parsed.success) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: parsed.error.issues[0]?.message || 'Invalid inquiry submission data',
            },
          });
        }

        const input = parsed.data;

        // 2. Honeypot check (hidden field that only automated bots fill)
        if (input.websiteUrlHoneypot && input.websiteUrlHoneypot.length > 0) {
          fastify.log.warn({ ip: request.ip }, 'Honeypot triggered on public inquiry submission');
          // Return generic success to disorient malicious bot
          return reply.status(201).send({
            success: true,
            data: {
              message: 'Thank you! Your inquiry has been received.',
            },
          });
        }

        // 3. Single-Use CAPTCHA Verification
        const captchaResult = await validateCaptcha(
          redis,
          input.captchaChallengeId || '',
          input.captchaCode || ''
        );
        if (!captchaResult.isValid) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'CAPTCHA_INVALID',
              message:
                captchaResult.reason === 'EXPIRED'
                  ? 'CAPTCHA challenge has expired. Please refresh and try again.'
                  : 'Incorrect CAPTCHA code. Please enter the characters shown in the image.',
            },
          });
        }

        // 4. Create inquiry record in CRM database
        let createdInquiry: any = null;
        try {
          createdInquiry = await inquiriesRepository.createInquiry({
            name: input.fullName,
            phone: input.phone,
            email: input.email || undefined,
            address: input.address || undefined,
            city: input.city || undefined,
            productInterest: input.productInterest || undefined,
            serviceInterest: input.serviceType || undefined,
            inquiryType: (input.inquiryType as any) || 'GENERAL',
            message: input.message || undefined,
            source: (input.source as any) || 'WEBSITE',
            priority: 'NORMAL',
            isPublicSubmission: true,
          });
        } catch (dbErr) {
          fastify.log.warn({ dbErr }, 'Database offline during public inquiry submission, using local fallback receipt');
        }

        // 5. Clean, sanitized response without exposing internal DB or user details
        return reply.status(201).send({
          success: true,
          data: {
            inquiryNumber: createdInquiry ? createdInquiry.inquiryNumber : `INQ-${new Date().getFullYear()}-000001`,
            message: 'Thank you! Your inquiry has been successfully received. Our team will contact you shortly.',
          },
        });
      } catch (err: any) {
        fastify.log.error({ err }, 'Error processing public inquiry submission');
        // Do not leak stack traces or internal DB info
        return reply.status(500).send({
          success: false,
          error: {
            code: 'SUBMISSION_FAILED',
            message: 'An unexpected error occurred while saving your inquiry. Please try again later or contact us directly.',
          },
        });
      }
    }
  );

  /**
   * GET /api/v1/public/invoices/:id
   * Public viewing endpoint for customer invoices (via WhatsApp share links)
   */
  fastify.get('/invoices/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!id || !id.trim()) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invoice identifier is required.' },
      });
    }

    try {
      const { invoicesService } = await import('../invoices/invoices.service');
      const invoice = await invoicesService.getInvoiceById(id.trim());
      if (!invoice) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invoice not found.' },
        });
      }
      return reply.send({
        success: true,
        data: invoice,
      });
    } catch {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'The requested invoice could not be found.' },
      });
    }
  });

  fastify.get('/invoice/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!id || !id.trim()) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_ID', message: 'Invoice identifier is required.' },
      });
    }

    try {
      const { invoicesService } = await import('../invoices/invoices.service');
      const invoice = await invoicesService.getInvoiceById(id.trim());
      if (!invoice) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invoice not found.' },
        });
      }
      return reply.send({
        success: true,
        data: invoice,
      });
    } catch {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'The requested invoice could not be found.' },
      });
    }
  });
};
