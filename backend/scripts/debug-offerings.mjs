import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { Offering } from '../src/modules/offerings/offering.model.js';
import { Service } from '../src/modules/services/service.model.js';
import { OFFERING_STATUS } from '../src/shared/enums/offering.enums.js';
import { SERVICE_STATUS } from '../src/shared/enums/service.enums.js';

await mongoose.connect(process.env.MONGODB_URI);
const instituteId = '6a53430d9ea52ff61fe43a27';
const now = new Date();

const q = {
  instituteId,
  status: OFFERING_STATUS.ACTIVE,
  $and: [
    { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
    { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] },
  ],
};

const withDates = await Offering.find(q).select('name status serviceId startDate endDate');
console.log('with date filter', withDates.length, withDates.map((o) => o.name));

const noDates = await Offering.find({
  instituteId,
  status: OFFERING_STATUS.ACTIVE,
}).select('name status serviceId startDate endDate');
console.log('without date filter', noDates.length, noDates.map((o) => o.name));

const services = await Service.find({ instituteId, status: SERVICE_STATUS.ACTIVE });
console.log(
  'services',
  services.map((s) => ({ name: s.name, id: s._id.toString(), status: s.status })),
);

await mongoose.disconnect();
