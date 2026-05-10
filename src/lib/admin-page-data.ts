import { AdminDataUnavailableError, type AdminState, getAdminState } from "@/lib/admin-store";

export type AdminPageDataResult =
  | {
      state: AdminState;
      dataError: null;
    }
  | {
      state: null;
      dataError: string;
    };

export async function loadAdminPageData(): Promise<AdminPageDataResult> {
  try {
    return {
      state: await getAdminState(),
      dataError: null,
    };
  } catch (error) {
    if (error instanceof AdminDataUnavailableError) {
      return {
        state: null,
        dataError: error.message,
      };
    }

    throw error;
  }
}