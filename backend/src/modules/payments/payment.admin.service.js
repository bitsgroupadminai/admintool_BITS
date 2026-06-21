import mongoose from 'mongoose';
import { Payment } from './payment.model.js';
import { Offering } from '../offerings/offering.model.js';
import { Service } from '../services/service.model.js';
import { Application } from '../applications/application.model.js';
import { AppError } from '../../core/utils/AppError.js';
import { PAYMENT_STATUS, PAYMENT_PURPOSE } from '../../shared/enums/payment.enums.js';
import { formatPaymentConfig } from './payment.service.js';

function formatAmountFromPaise(amountPaise, currency = 'INR') {
  const amount = amountPaise / 100;
  if (currency === 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return `${currency} ${amount.toFixed(2)}`;
}

function formatPurposeLabel(purpose) {
  if (purpose === PAYMENT_PURPOSE.WORKFLOW_STEP) return 'Workflow step';
  if (purpose === PAYMENT_PURPOSE.BEFORE_SUBMIT) return 'Before submit';
  return purpose;
}

function formatStatusLabel(status) {
  if (status === PAYMENT_STATUS.PAID) return 'Paid';
  if (status === PAYMENT_STATUS.FAILED) return 'Failed';
  if (status === PAYMENT_STATUS.CREATED) return 'Pending';
  return status;
}

/**
 * @param {import('./payment.model.js').Payment} payment
 * @param {Record<string, string>} [names]
 */
function formatAdminPayment(payment, names = {}) {
  return {
    id: payment._id.toString(),
    status: payment.status,
    statusLabel: formatStatusLabel(payment.status),
    label: payment.label,
    amountPaise: payment.amountPaise,
    amountDisplay: formatAmountFromPaise(payment.amountPaise, payment.currency),
    currency: payment.currency,
    purpose: payment.purpose,
    purposeLabel: formatPurposeLabel(payment.purpose),
    workflowStepId: payment.workflowStepId ?? null,
    applicantEmail: payment.applicantEmail,
    applicantName: names.applicantName ?? '',
    serviceId: payment.serviceId.toString(),
    serviceName: names.serviceName ?? '',
    offeringId: payment.offeringId.toString(),
    offeringName: names.offeringName ?? '',
    applicationId: payment.applicationId.toString(),
    applicationStatus: names.applicationStatus ?? '',
    razorpayOrderId: payment.razorpayOrderId,
    razorpayPaymentId: payment.razorpayPaymentId ?? null,
    paidAt: payment.paidAt ?? null,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

async function loadPaymentNames(payments) {
  const applicationIds = [...new Set(payments.map((p) => p.applicationId.toString()))];
  const serviceIds = [...new Set(payments.map((p) => p.serviceId.toString()))];
  const offeringIds = [...new Set(payments.map((p) => p.offeringId.toString()))];

  const [applications, services, offerings] = await Promise.all([
    Application.find({ _id: { $in: applicationIds } }).select('applicantName status'),
    Service.find({ _id: { $in: serviceIds } }).select('name'),
    Offering.find({ _id: { $in: offeringIds } }).select('name'),
  ]);

  const applicationMap = new Map(
    applications.map((item) => [
      item._id.toString(),
      { applicantName: item.applicantName, applicationStatus: item.status },
    ]),
  );
  const serviceMap = new Map(services.map((item) => [item._id.toString(), item.name]));
  const offeringMap = new Map(offerings.map((item) => [item._id.toString(), item.name]));

  return payments.map((payment) => {
    const application = applicationMap.get(payment.applicationId.toString()) ?? {};
    return formatAdminPayment(payment, {
      applicantName: application.applicantName ?? '',
      applicationStatus: application.applicationStatus ?? '',
      serviceName: serviceMap.get(payment.serviceId.toString()) ?? '',
      offeringName: offeringMap.get(payment.offeringId.toString()) ?? '',
    });
  });
}

/**
 * @param {string} instituteId
 * @param {import('zod').infer<typeof import('./payment.admin.validator.js').listAdminPaymentsQuerySchema>} query
 */
export async function listAdminPayments(instituteId, query) {
  const filter = { instituteId: new mongoose.Types.ObjectId(instituteId) };

  if (query.status) filter.status = query.status;
  if (query.serviceId) filter.serviceId = query.serviceId;
  if (query.offeringId) filter.offeringId = query.offeringId;
  if (query.applicationId) filter.applicationId = query.applicationId;

  if (query.search?.trim()) {
    const search = query.search.trim();
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { applicantEmail: regex },
      { label: regex },
      { razorpayOrderId: regex },
      { razorpayPaymentId: regex },
    ];
  }

  const sortField = query.sortBy;
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
  const skip = (query.page - 1) * query.limit;

  const [payments, total] = await Promise.all([
    Payment.find(filter).sort({ [sortField]: sortDirection }).skip(skip).limit(query.limit),
    Payment.countDocuments(filter),
  ]);

  const formatted = await loadPaymentNames(payments);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  return {
    payments: formatted,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPrevPage: query.page > 1,
    },
  };
}

/**
 * @param {string} instituteId
 * @param {string} paymentId
 */
export async function getAdminPaymentDetail(instituteId, paymentId) {
  const payment = await Payment.findOne({ _id: paymentId, instituteId });
  if (!payment) {
    throw new AppError('Payment not found', 404);
  }

  const [application, service, offering] = await Promise.all([
    Application.findById(payment.applicationId).select('applicantName applicantEmail status createdAt'),
    Service.findById(payment.serviceId).select('name description'),
    Offering.findById(payment.offeringId).select('name paymentConfig'),
  ]);

  const [formatted] = await loadPaymentNames([payment]);

  return {
    payment: {
      ...formatted,
      application: application
        ? {
            id: application._id.toString(),
            applicantName: application.applicantName,
            applicantEmail: application.applicantEmail,
            status: application.status,
            createdAt: application.createdAt,
          }
        : null,
      service: service
        ? { id: service._id.toString(), name: service.name, description: service.description ?? '' }
        : null,
      offering: offering
        ? {
            id: offering._id.toString(),
            name: offering.name,
            paymentConfig: formatPaymentConfig(offering.paymentConfig),
          }
        : null,
    },
  };
}

/**
 * @param {string} instituteId
 */
export async function getAdminPaymentOverview(instituteId) {
  const instituteObjectId = new mongoose.Types.ObjectId(instituteId);

  const [paidAgg, statusCounts, feeOfferings, recentPaid] = await Promise.all([
    Payment.aggregate([
      { $match: { instituteId: instituteObjectId, status: PAYMENT_STATUS.PAID } },
      { $group: { _id: null, totalPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { instituteId: instituteObjectId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Offering.find({ instituteId, 'paymentConfig.enabled': true })
      .select('name serviceId paymentConfig status')
      .sort({ name: 1 }),
    Payment.find({ instituteId, status: PAYMENT_STATUS.PAID })
      .sort({ paidAt: -1 })
      .limit(5),
  ]);

  const serviceIds = [...new Set(feeOfferings.map((item) => item.serviceId.toString()))];
  const services = await Service.find({ _id: { $in: serviceIds } }).select('name');
  const serviceMap = new Map(services.map((item) => [item._id.toString(), item.name]));

  const statusMap = Object.fromEntries(statusCounts.map((item) => [item._id, item.count]));
  const totalCollectedPaise = paidAgg[0]?.totalPaise ?? 0;
  const paidCount = paidAgg[0]?.count ?? 0;

  const feeEnabledServices = feeOfferings.reduce((accumulator, offering) => {
    const serviceId = offering.serviceId.toString();
    const serviceName = serviceMap.get(serviceId) ?? 'Unknown service';
    const config = formatPaymentConfig(offering.paymentConfig);
    const entry = {
      offeringId: offering._id.toString(),
      offeringName: offering.name,
      offeringStatus: offering.status,
      feeLabel: config.label,
      amount: config.amount,
      amountDisplay: formatAmountFromPaise(rupeesToPaise(config.amount), config.currency),
      currency: config.currency,
      timing: config.timing,
      workflowStepId: config.workflowStepId,
    };

    const existing = accumulator.find((item) => item.serviceId === serviceId);
    if (existing) {
      existing.offerings.push(entry);
      return accumulator;
    }

    accumulator.push({
      serviceId,
      serviceName,
      offerings: [entry],
    });
    return accumulator;
  }, []);

  const recent = await loadPaymentNames(recentPaid);

  return {
    summary: {
      totalCollectedDisplay: formatAmountFromPaise(totalCollectedPaise),
      totalCollectedPaise,
      paidCount,
      pendingCount: statusMap[PAYMENT_STATUS.CREATED] ?? 0,
      failedCount: statusMap[PAYMENT_STATUS.FAILED] ?? 0,
      feeEnabledOfferingCount: feeOfferings.length,
      feeEnabledServiceCount: feeEnabledServices.length,
    },
    feeEnabledServices,
    recentPayments: recent,
  };
}

function rupeesToPaise(amount) {
  return Math.round(Number(amount) * 100);
}
