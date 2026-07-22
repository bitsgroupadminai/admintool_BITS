import dotenv from 'dotenv';
dotenv.config();
import { connectDb } from '../src/core/config/db.js';
import { connectRedis, redisClient } from '../src/core/config/redis.js';
import { Offering } from '../src/modules/offerings/offering.model.js';
import { Service } from '../src/modules/services/service.model.js';
import { OFFERING_STATUS } from '../src/shared/enums/offering.enums.js';
import { SERVICE_STATUS } from '../src/shared/enums/service.enums.js';

const instituteId = '6a53430d9ea52ff61fe43a27';

await connectDb();
await connectRedis();
const keys = await redisClient.keys('*student*');
console.log('redis student keys', keys);
if (keys.length) await redisClient.del(keys);

const services = await Service.find({ instituteId, status: SERVICE_STATUS.ACTIVE });
const serviceById = new Map(services.map((s) => [s._id.toString(), s]));
const offerings = await Offering.find({ instituteId, status: OFFERING_STATUS.ACTIVE });
console.log('active offerings', offerings.length);
for (const o of offerings) {
  const service = serviceById.get(o.serviceId.toString());
  console.log({
    name: o.name,
    serviceId: o.serviceId.toString(),
    serviceFound: Boolean(service),
    serviceName: service?.name,
  });
}

// Import after DB to mirror app
const { listEnrollmentOfferings } = await import('../src/modules/student/student.service.js');
const listed = await listEnrollmentOfferings(instituteId);
console.log('listed count', listed.length);
console.log(listed.map((o) => ({ name: o.name, serviceName: o.serviceName, serviceId: o.serviceId })));
process.exit(0);
