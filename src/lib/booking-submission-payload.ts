export type BookingSubmissionInput = {
  serviceCatalogItemId: string;
  preferredDate: string;
  preferredWindow: string;
  preferredDateTime: string;
  preferredTechnicianId: string;
  notes: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  stateProvince: string;
};

export function buildCoreHiddenFields(input: BookingSubmissionInput) {
  return {
    serviceCatalogItemId: input.serviceCatalogItemId,
    preferredDate: input.preferredDate,
    preferredWindow: input.preferredWindow,
    preferredDateTime: input.preferredDateTime,
    preferredTechnicianId: input.preferredTechnicianId,
    notes: input.notes,
  };
}

export function buildContactHiddenFields(input: BookingSubmissionInput) {
  return {
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2,
    city: input.city,
    postalCode: input.postalCode,
    stateProvince: input.stateProvince,
  };
}
