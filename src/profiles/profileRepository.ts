import type { SupabaseClient } from '@supabase/supabase-js';
import {
  USER_ROLES,
  USER_STATUSES,
  type User,
  type UserRole,
  type UserStatus,
} from '../users/user';
import type { ProfileRepository } from '../auth/auth';

export type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export function mapProfileRow(row: ProfileRow): User {
  if (
    !USER_ROLES.includes(row.role as UserRole) ||
    !USER_STATUSES.includes(row.status as UserStatus)
  ) {
    throw new Error('The authenticated profile has an unsupported role or status.');
  }

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    email: row.email,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    createdDate: row.created_at,
    updatedDate: row.updated_at,
  };
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getProfile(userId: string) {
    const { data, error } = await this.client
      .from('profiles')
      .select(
        'id, first_name, last_name, display_name, email, role, status, created_at, updated_at',
      )
      .eq('id', userId)
      .maybeSingle<ProfileRow>();

    if (error) throw error;
    return data ? mapProfileRow(data) : null;
  }
}
