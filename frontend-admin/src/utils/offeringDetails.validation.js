/**
 * @param {{
 *   name?: string;
 *   description?: string;
 *   startDate?: string;
 *   endDate?: string;
 *   applicantFields?: Array<any>;
 *   intakeDocument?: { enabled?: boolean; label?: string };
 * }} input
 */
export function validateOfferingDetails(input) {
  const errors = {};
  const fieldErrors = {};

  const trimmedName = input.name?.trim() ?? '';
  if (!trimmedName) {
    errors.name = 'Programme name is required';
  } else if (trimmedName.length < 2) {
    errors.name = 'Programme name must be at least 2 characters';
  } else if (trimmedName.length > 200) {
    errors.name = 'Programme name must be 200 characters or fewer';
  }

  const description = input.description?.trim() ?? '';
  if (description.length > 2000) {
    errors.description = 'Description must be 2000 characters or fewer';
  }

  const { startDate, endDate } = input;
  if (startDate && endDate && endDate < startDate) {
    errors.endDate = 'Closing date must be on or after the opening date';
  }

  const seenLabels = new Set();
  (input.applicantFields ?? []).forEach((field, index) => {
    const label = field.label?.trim() ?? '';
    const rowErrors = {};

    if (!label) {
      rowErrors.label = 'Field label is required';
    } else if (label.length < 2) {
      rowErrors.label = 'Label must be at least 2 characters';
    } else {
      const normalized = label.toLowerCase();
      if (seenLabels.has(normalized)) {
        rowErrors.label = 'Each field label must be unique';
      }
      seenLabels.add(normalized);
    }

    if (field.fieldType === 'select' && !(field.options?.filter(Boolean).length >= 1)) {
      rowErrors.options = 'Add at least one dropdown option';
    }

    if (Object.keys(rowErrors).length > 0) {
      fieldErrors[index] = rowErrors;
    }
  });

  if (Object.keys(fieldErrors).length > 0) {
    errors.applicantFields = fieldErrors;
  }

  if (input.intakeDocument?.enabled) {
    const label = input.intakeDocument.label?.trim() ?? '';
    if (!label) {
      errors.intakeDocument = 'Document name is required when intake upload is enabled';
    } else if (label.length < 2) {
      errors.intakeDocument = 'Document name must be at least 2 characters';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
