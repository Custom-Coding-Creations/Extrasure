/**
 * Scheduling engine: calculates available appointment slots based on technician schedules,
 * service duration, minimum notice, and drive time between appointments
 */

import { db } from "@/lib/prisma";
import { getSchedulingConfig } from "@/lib/admin-store";
import { getDistance, secondsToMinutes } from "@/lib/distance";

export interface AvailableSlot {
  start: Date;
  end: Date;
  technicianId: string | null;
  technicianName: string | null;
  estimatedDriveTimeMinutes: number;
}

export interface BookingAvailability {
  date: Date;
  availableSlots: AvailableSlot[];
  isSameDayBooking: boolean;
  sameDaySurchargPercent: number;
}

/**
 * Time utility functions
 */
function timeToMinutes(time: string | null | undefined): number {
  if (!time) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * Check if a date is in the past (within the same day it's still bookable unless after hours)
 */
function isDateInPast(date: Date): boolean {
  const now = new Date();
  return date < now && date.getDate() !== now.getDate();
}

/**
 * Get the day of week from a date (0 = Sunday, 1 = Monday, etc.)
 */
function getDayOfWeek(date: Date): number {
  return date.getDay();
}

const DAYS_OF_WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function getDayOfWeekName(dayIndex: number): string {
  return DAYS_OF_WEEK[dayIndex];
}

/**
 * Get a technician's scheduled hours for a specific date
 */
async function getTechnicianAvailability(
  technicianId: string,
  date: Date
): Promise<{
  startTime: number;
  endTime: number;
  breakStartTime: number;
  breakEndTime: number;
} | null> {
  const dayOfWeek = getDayOfWeekName(getDayOfWeek(date));
  const dateStr = date.toISOString().split("T")[0];

  // Check for exceptions first
  const exception = await db.technicianScheduleException.findFirst({
    where: {
      technicianId,
      exceptionDate: {
        gte: new Date(dateStr),
        lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000),
      },
    },
  });

  // If it's a day off, return null
  if (exception?.isDayOff) {
    return null;
  }

  // If there's an exception with custom hours, use those
  if (exception && exception.startTime && exception.endTime) {
    return {
      startTime: timeToMinutes(exception.startTime),
      endTime: timeToMinutes(exception.endTime),
      breakStartTime: exception.breakStartTime ? timeToMinutes(exception.breakStartTime) : 0,
      breakEndTime: exception.breakEndTime ? timeToMinutes(exception.breakEndTime) : 0,
    };
  }

  // Get the recurring schedule for this day
  const schedule = await db.technicianSchedule.findFirst({
    where: {
      technicianId,
      dayOfWeek,
    },
  });

  if (!schedule) {
    return null;
  }

  return {
    startTime: timeToMinutes(schedule.startTime),
    endTime: timeToMinutes(schedule.endTime),
    breakStartTime: schedule.breakStartTime ? timeToMinutes(schedule.breakStartTime) : 0,
    breakEndTime: schedule.breakEndTime ? timeToMinutes(schedule.breakEndTime) : 0,
  };
}

/**
 * Get all booked appointments for a technician on a given date
 */
async function getTechnicianAppointments(
  technicianId: string,
  date: Date
): Promise<
  Array<{
    start: number; // minutes since midnight
    end: number; // minutes since midnight
  }>
> {
  const dateStr = date.toISOString().split("T")[0];
  const startOfDay = new Date(dateStr);
  const endOfDay = new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000);

  const bookings = await db.serviceBooking.findMany({
    where: {
      technicianId,
      scheduledAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
      status: {
        in: ["confirmed", "in_progress"],
      },
    },
    select: {
      scheduledAt: true,
      service: {
        select: {
          durationMinutes: true,
        },
      },
    },
  });

  return bookings
    .filter((b) => b.scheduledAt !== null)
    .map((b) => {
      const startMinutes = b.scheduledAt!.getHours() * 60 + b.scheduledAt!.getMinutes();
      return {
        start: startMinutes,
        end: startMinutes + (b.service.durationMinutes || 90),
      };
    })
    .sort((a, b) => a.start - b.start);
}

/**
 * Generate available time slots for a given date and duration
 * considering technician's schedule, existing bookings, and drive time
 */
async function generateSlotsForTechnician(
  technicianId: string,
  date: Date,
  durationMinutes: number,
  customerLocation?: string,
  slotIntervalMinutes = 30
): Promise<AvailableSlot[]> {
  const availability = await getTechnicianAvailability(technicianId, date);

  // Technician not available this day
  if (!availability) {
    return [];
  }

  const appointments = await getTechnicianAppointments(technicianId, date);
  const slots: AvailableSlot[] = [];

  // Generate 30-minute intervals
  let currentMinutes = availability.startTime;

  while (currentMinutes + durationMinutes <= availability.endTime) {
    // Skip lunch break
    if (availability.breakStartTime > 0 && availability.breakEndTime > 0) {
      if (currentMinutes >= availability.breakStartTime && currentMinutes < availability.breakEndTime) {
        currentMinutes = availability.breakEndTime;
        continue;
      }
      // Skip if appointment would overlap break
      if (
        currentMinutes < availability.breakStartTime &&
        currentMinutes + durationMinutes > availability.breakStartTime
      ) {
        currentMinutes = availability.breakEndTime;
        continue;
      }
    }

    // Check if slot conflicts with existing appointments
    let hasConflict = false;
    for (const appointment of appointments) {
      // Slot ends at or after appointment starts AND slot starts before appointment ends
      if (currentMinutes < appointment.end && currentMinutes + durationMinutes > appointment.start) {
        hasConflict = true;
        currentMinutes = appointment.end;
        break;
      }
    }

    if (!hasConflict) {
      const startDate = new Date(date);
      startDate.setHours(Math.floor(currentMinutes / 60), currentMinutes % 60, 0, 0);
      const endDate = addMinutes(startDate, durationMinutes);

      let estimatedDriveTimeMinutes = 0;

      // Calculate drive time if customer location is provided
      if (customerLocation && appointments.length > 0) {
        try {
          const lastAppointment = appointments[appointments.length - 1];
          const lastAppointmentEnd = addMinutes(date, lastAppointment.end);
          // For now, we'd need to fetch the location of the last appointment
          // This is simplified - in production, you'd track service locations
          estimatedDriveTimeMinutes = 15; // Default estimate
        } catch (error) {
          console.error("Error calculating drive time:", error);
        }
      }

      slots.push({
        start: startDate,
        end: endDate,
        technicianId,
        technicianName: null, // Will be populated later
        estimatedDriveTimeMinutes,
      });
    }

    currentMinutes += slotIntervalMinutes;
  }

  return slots;
}

/**
 * Calculate available slots for a service on a given date
 * Returns slots across all available technicians or specified technicians
 */
export async function calculateAvailableSlots(
  date: Date,
  serviceId: string,
  technicianIds?: string[],
  customerLocation?: string,
  slotIntervalMinutes = 30
): Promise<BookingAvailability> {
  // Get service duration
  const service = await db.serviceCatalogItem.findUnique({
    where: { id: serviceId },
    select: { durationMinutes: true },
  });

  if (!service) {
    throw new Error(`Service ${serviceId} not found`);
  }

  // Get scheduling config
  const config = await getSchedulingConfig();

  // Get list of technicians
  let technicians = await db.technician.findMany({
    where: technicianIds ? { id: { in: technicianIds } } : undefined,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Check minimum notice requirement
  const now = new Date();
  const minimumNoticeMs = config.minimumNoticeHours * 60 * 60 * 1000;
  const earliestBookable = new Date(now.getTime() + minimumNoticeMs);

  if (date < earliestBookable) {
    return {
      date,
      availableSlots: [],
      isSameDayBooking: false,
      sameDaySurchargPercent: 0,
    };
  }

  // Check if this is same-day booking
  const today = new Date();
  const isSameDay =
    date.toISOString().split("T")[0] === today.toISOString().split("T")[0];

  if (isSameDay && !config.allowSameDayBooking) {
    return {
      date,
      availableSlots: [],
      isSameDayBooking: true,
      sameDaySurchargPercent: 0,
    };
  }

  // Generate slots for all technicians
  const allSlots: AvailableSlot[] = [];

  for (const technician of technicians) {
    const technicianSlots = await generateSlotsForTechnician(
      technician.id,
      date,
      service.durationMinutes || 90,
      customerLocation,
      slotIntervalMinutes
    );

    // Populate technician name
    const slotsWithName = technicianSlots.map((slot) => ({
      ...slot,
      technicianName: technician.name,
    }));

    allSlots.push(...slotsWithName);
  }

  // Sort by time
  allSlots.sort((a, b) => a.start.getTime() - b.start.getTime());

  return {
    date,
    availableSlots: allSlots,
    isSameDayBooking: isSameDay,
    sameDaySurchargPercent: isSameDay ? config.sameDaySurchargePercent : 0,
  };
}

/**
 * Find best technician for a given time slot based on proximity
 * Returns technician ID and estimated drive time
 */
export async function findBestTechnicianForSlot(
  slotStart: Date,
  customerLocation: string
): Promise<{
  technicianId: string;
  estimatedDriveTimeMinutes: number;
}> {
  // Get all available technicians (status not off_shift)
  const technicians = await db.technician.findMany({
    where: {
      status: {
        not: "off_shift",
      },
    },
    select: { id: true },
  });

  if (technicians.length === 0) {
    throw new Error("No technicians available");
  }

  // For MVP, just return first available technician
  // In production, integrate with Google Maps to find closest technician
  return {
    technicianId: technicians[0].id,
    estimatedDriveTimeMinutes: 15,
  };
}

/**
 * Validate that a booking fits within a technician's schedule
 */
export async function validateBookingFitsSchedule(
  slotStart: Date,
  slotEnd: Date,
  technicianId: string,
  durationMinutes: number
): Promise<{ valid: boolean; reason?: string }> {
  // Check technician availability
  const availability = await getTechnicianAvailability(technicianId, slotStart);

  if (!availability) {
    return { valid: false, reason: "Technician not available on this date" };
  }

  const startMinutes = slotStart.getHours() * 60 + slotStart.getMinutes();
  const endMinutes = startMinutes + durationMinutes;

  // Check if within working hours
  if (startMinutes < availability.startTime || endMinutes > availability.endTime) {
    return { valid: false, reason: "Appointment outside technician's working hours" };
  }

  // Check if within lunch break
  if (availability.breakStartTime > 0 && availability.breakEndTime > 0) {
    if (startMinutes < availability.breakEndTime && endMinutes > availability.breakStartTime) {
      return { valid: false, reason: "Appointment conflicts with technician's break" };
    }
  }

  // Check for conflicts with existing appointments
  const appointments = await getTechnicianAppointments(technicianId, slotStart);

  for (const appointment of appointments) {
    if (startMinutes < appointment.end && endMinutes > appointment.start) {
      return { valid: false, reason: "Time slot conflicts with existing appointment" };
    }
  }

  return { valid: true };
}
