// infra — 영속화 어댑터 엔트리.
export {
  createInMemoryRepository,
  type DesignRepository,
  type TokenRole,
} from './repository';
export { createSupabaseClient, createSupabaseRepository } from './supabase';
