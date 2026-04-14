const express = require('express');
const { OrdersService } = require('../../../services/ordersService');
const { EmailService } = require('../../../services/emailService');

const router = express.Router();

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const { status, email, phone, customerId } = req.query;
    const data = await OrdersService.listOrders({
      status,
      email,
      phone,
      customer_id: customerId ? Number(customerId) : undefined
    });
    res.json({
      success: true,
      data,
      message: 'Orders fetched successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch orders'
    });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    const data = await OrdersService.getOrderById(id);
    // Avoid stale status during payment return/polling.
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.json({
      success: true,
      data,
      message: 'Order fetched successfully'
    });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Order not found'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to fetch order'
    });
  }
});

// GET /api/orders/:id/invoice
router.get('/:id/invoice', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    const orderData = await OrdersService.getOrderById(id);
    const settings = await EmailService.getSmtpSettings();
    const payment = (orderData?.payments || [])[0] || null;
    const invoicePdf = await EmailService.buildInvoicePdfBuffer({
      order: orderData,
      items: orderData.items || [],
      payment,
      settings
    });
    const invoiceNumber = orderData?.order_code || orderData?.order_number || orderData?.id || id;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceNumber}.pdf"`);
    res.send(invoicePdf);
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Order not found'
      });
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to generate invoice'
    });
  }
});

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const data = await OrdersService.createOrder(req.body);
    res.status(201).json({
      success: true,
      data,
      message: 'Order created successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to create order'
    });
  }
});

// POST /api/orders/:id/status
router.post('/:id/status', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    const { status, note } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required',
        message: 'Status is required'
      });
    }
    const updated = await OrdersService.updateOrderStatus(id, status, note);
    res.json({
      success: true,
      data: updated,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to update order status'
    });
  }
});

// POST /api/orders/email-queue/process
router.post('/email-queue/process', async (req, res) => {
  try {
    const cronKey = process.env.EMAIL_QUEUE_CRON_KEY || '';
    if (cronKey) {
      const provided = req.headers['x-cron-key'] || req.query.key || '';
      if (String(provided) !== String(cronKey)) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid cron key'
        });
      }
    }

    const limit = Math.min(50, Math.max(1, Number(req.body?.limit || req.query?.limit || 10)));
    const nowIso = new Date().toISOString();
    const { createAdminClient } = require('../../../supabase/config/supabaseClient');
    const adminClient = createAdminClient();

    const { data: jobs, error: jobsError } = await adminClient
      .from('email_jobs')
      .select('*')
      .in('status', ['pending', 'retry'])
      .lte('next_attempt_at', nowIso)
      .order('id', { ascending: true })
      .limit(limit);

    if (jobsError) {
      throw new Error(`Queue read failed: ${jobsError.message}`);
    }

    const results = [];
    for (const job of jobs || []) {
      const jobId = job.id;
      try {
        await adminClient
          .from('email_jobs')
          .update({ status: 'processing', updated_at: new Date().toISOString() })
          .eq('id', jobId);

        const orderData = await OrdersService.getOrderById(job.order_id, { skipExpiryCheck: true });
        const payment = (orderData?.payments || [])[0] || null;
        let sendResult = { sent: false, reason: 'Unknown job type' };
        const payload = job.payload || {};

        if (job.job_type === 'order_confirmation') {
          sendResult = await EmailService.sendOrderConfirmation({
            order: orderData,
            items: orderData?.items || [],
            payment,
            includeInvoicePdf: Boolean(payload.includeInvoicePdf)
          });
        } else if (job.job_type === 'order_cancellation') {
          sendResult = await EmailService.sendOrderCancellation({ order: orderData });
        } else if (job.job_type === 'status_update') {
          sendResult = await EmailService.sendOrderStatusUpdate({
            order: orderData,
            status: payload.status || orderData?.status,
            note: payload.note || ''
          });
        }

        if (sendResult?.sent) {
          await adminClient
            .from('email_jobs')
            .update({
              status: 'sent',
              last_error: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', jobId);
          results.push({ id: jobId, status: 'sent' });
          continue;
        }

        const attempts = Number(job.attempts || 0) + 1;
        const maxAttempts = 3;
        const nextStatus = attempts >= maxAttempts ? 'failed' : 'retry';
        const delayMinutes = attempts >= maxAttempts ? 0 : attempts * 2;
        const nextAttemptAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
        await adminClient
          .from('email_jobs')
          .update({
            status: nextStatus,
            attempts,
            last_error: sendResult?.reason || 'Email send skipped',
            next_attempt_at: nextAttemptAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
        results.push({ id: jobId, status: nextStatus, reason: sendResult?.reason || 'Skipped' });
      } catch (jobError) {
        const attempts = Number(job.attempts || 0) + 1;
        const maxAttempts = 3;
        const nextStatus = attempts >= maxAttempts ? 'failed' : 'retry';
        const delayMinutes = attempts >= maxAttempts ? 0 : attempts * 2;
        const nextAttemptAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
        await adminClient
          .from('email_jobs')
          .update({
            status: nextStatus,
            attempts,
            last_error: jobError?.message || String(jobError || 'Unknown queue error'),
            next_attempt_at: nextAttemptAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', jobId);
        results.push({ id: jobId, status: nextStatus, reason: jobError?.message || 'Queue error' });
      }
    }

    res.json({
      success: true,
      data: {
        processed: results.length,
        results
      },
      message: 'Email queue processed'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to process email queue'
    });
  }
});

// POST /api/orders/:id/send-email
router.post('/:id/send-email', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    const { includeInvoicePdf } = req.body || {};
    const orderData = await OrdersService.getOrderById(id);
    const payment = (orderData?.payments || [])[0] || null;
    const result = await EmailService.sendOrderConfirmation({
      order: orderData,
      items: orderData?.items || [],
      payment,
      includeInvoicePdf: Boolean(includeInvoicePdf)
    });
    if (result?.skipped) {
      return res.status(400).json({
        success: false,
        error: result.reason || 'Email not sent',
        message: 'Email not sent'
      });
    }
    res.json({
      success: true,
      message: 'Order confirmation email sent'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error',
      message: 'Failed to send email'
    });
  }
});

// DELETE /api/orders/:id (COD only)
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
        message: 'ID must be a number'
      });
    }
    const result = await OrdersService.deleteCodOrder(id);
    res.json({
      success: true,
      data: result,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    const msg = error.message || 'Failed to delete order';
    const status = msg.includes('not found') ? 404 : msg.includes('COD') ? 400 : 500;
    res.status(status).json({
      success: false,
      error: msg,
      message: msg
    });
  }
});

module.exports = router;
