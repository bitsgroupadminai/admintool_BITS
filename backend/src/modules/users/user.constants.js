export const STUDENT_SORT_FIELDS = new Set([
  'name',
  'email',
  'createdAt',
  'enrollmentStatus',
  'enrolledProgrammeName',
]);

export const STUDENT_IMPORT_REQUIRED_FIELDS = ['name', 'email', 'password', 'programmeName'];

export const STUDENT_IMPORT_COLUMN_ALIASES = {
  name: ['name', 'fullname', 'studentname'],
  email: ['email', 'emailaddress'],
  password: ['password', 'temporarypassword', 'temppassword'],
  offeringId: ['offeringid', 'programmeid', 'programid'],
  programmeName: ['programmename', 'programme', 'course', 'coursename', 'program', 'programname'],
};
