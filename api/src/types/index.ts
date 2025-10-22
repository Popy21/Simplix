// Types pour la nouvelle base de données PostgreSQL

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  website?: string;
  industry?: string;
  size?: string;
  timezone: string;
  currency: string;
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';
  subscription_plan: 'free' | 'starter' | 'professional' | 'enterprise';
  subscription_start_date?: Date;
  subscription_end_date?: Date;
  trial_ends_at?: Date;
  billing_email?: string;
  billing_address?: any;
  settings?: any;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface User {
  id: string;
  organization_id: string;
  email: string;
  password_hash?: string;
  email_verified: boolean;
  email_verified_at?: Date;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  timezone: string;
  language: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  last_login_at?: Date;
  last_active_at?: Date;
  two_factor_enabled: boolean;
  two_factor_secret?: string;
  password_reset_token?: string;
  password_reset_expires?: Date;
  metadata?: any;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface Role {
  id: string;
  organization_id: string;
  name: string;
  type: 'owner' | 'admin' | 'manager' | 'user' | 'guest';
  description?: string;
  permissions: string[];
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Company {
  id: string;
  organization_id: string;
  name: string;
  legal_name?: string;
  website?: string;
  logo_url?: string;
  industry?: string;
  company_size?: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+';
  annual_revenue?: number;
  description?: string;
  email?: string;
  phone?: string;
  address?: any;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  owner_id?: string;
  assigned_to?: string;
  tags?: string[];
  custom_fields?: any;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface Contact {
  id: string;
  organization_id: string;
  company_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  avatar_url?: string;
  title?: string;
  department?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: any;
  linkedin_url?: string;
  twitter_url?: string;
  type: 'lead' | 'prospect' | 'customer' | 'partner' | 'other';
  source?: string;
  owner_id?: string;
  assigned_to?: string;
  score: number;
  tags?: string[];
  custom_fields?: any;
  notes?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface Pipeline {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  currency: string;
  display_order: number;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  description?: string;
  win_probability: number;
  display_order: number;
  is_closed: boolean;
  color?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Deal {
  id: string;
  organization_id: string;
  pipeline_id: string;
  stage_id: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  contact_id?: string;
  company_id?: string;
  owner_id?: string;
  assigned_to?: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  expected_close_date?: Date;
  actual_close_date?: Date;
  won_at?: Date;
  lost_at?: Date;
  lost_reason?: string;
  tags?: string[];
  custom_fields?: any;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface Task {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'canceled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  contact_id?: string;
  company_id?: string;
  deal_id?: string;
  parent_task_id?: string;
  assigned_to?: string;
  assigned_by?: string;
  due_date?: Date;
  start_date?: Date;
  completed_at?: Date;
  tags?: string[];
  custom_fields?: any;
  checklist?: any[];
  created_by?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface Notification {
  id: string;
  organization_id: string;
  user_id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'task' | 'mention' | 'system';
  title: string;
  message?: string;
  action_url?: string;
  action_label?: string;
  entity_type?: string;
  entity_id?: string;
  read: boolean;
  read_at?: Date;
  metadata?: any;
  created_at: Date;
}

export interface EmailCampaign {
  id: string;
  organization_id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  template_id?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'canceled';
  scheduled_at?: Date;
  sent_at?: Date;
  target_contacts?: string[];
  target_filter?: any;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

// Request/Response Types

export interface CreateUserRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  organization_id: string;
}

export interface CreateCompanyRequest {
  organization_id: string;
  name: string;
  website?: string;
  industry?: string;
  company_size?: string;
}

export interface CreateContactRequest {
  organization_id: string;
  company_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  type?: string;
}

export interface CreateDealRequest {
  organization_id: string;
  pipeline_id: string;
  stage_id: string;
  title: string;
  value: number;
  contact_id?: string;
  company_id?: string;
}

export interface CreateTaskRequest {
  organization_id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  due_date?: Date;
  priority?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filter?: any;
}
