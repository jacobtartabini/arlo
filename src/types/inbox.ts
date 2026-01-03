// Inbox types - provider-agnostic

export type InboxProvider = 
  | 'gmail'
  | 'outlook'
  | 'teams'
  | 'whatsapp'
  | 'telegram'
  | 'instagram'
  | 'linkedin';

export interface InboxAccount {
  id: string;
  user_key: string;
  provider: InboxProvider;
  account_email?: string;
  account_name: string;
  account_id: string;
  scopes?: string[];
  last_sync_at?: string;
  last_sync_error?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  token_expires_at?: string;
}

export interface InboxParticipant {
  name: string;
  email?: string;
  handle?: string;
  avatar_url?: string;
}

export interface InboxThread {
  id: string;
  user_key: string;
  account_id: string;
  provider: InboxProvider;
  external_thread_id: string;
  subject?: string;
  snippet?: string;
  participants: InboxParticipant[];
  unread_count: number;
  message_count: number;
  is_pinned: boolean;
  is_archived: boolean;
  is_starred: boolean;
  labels: string[];
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InboxAttachment {
  name: string;
  mime_type: string;
  size: number;
  url?: string;
}

export interface InboxMessage {
  id: string;
  user_key: string;
  thread_id: string;
  account_id: string;
  provider: InboxProvider;
  external_message_id: string;
  sender: InboxParticipant;
  recipients: InboxParticipant[];
  subject?: string;
  body_text?: string;
  body_html?: string;
  attachments: InboxAttachment[];
  is_read: boolean;
  is_outgoing: boolean;
  in_reply_to?: string;
  sent_at: string;
  received_at: string;
  created_at: string;
}

export interface InboxDraft {
  id: string;
  user_key: string;
  thread_id: string;
  account_id: string;
  content: string;
  ai_generated: boolean;
  sent: boolean;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface InboxSyncState {
  id: string;
  user_key: string;
  account_id: string;
  sync_type: 'initial' | 'incremental';
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  messages_synced: number;
  threads_synced: number;
  created_at: string;
}

export type InboxFilter = 'all' | 'unread' | 'needs_reply' | 'pinned' | 'starred';

export interface InboxFilterState {
  filter: InboxFilter;
  providers: InboxProvider[];
  accounts: string[]; // account IDs
  searchQuery: string;
}

// Provider metadata for UI
export const PROVIDER_META: Record<InboxProvider, {
  name: string;
  icon: string;
  color: string;
  supportsOAuth: boolean;
  supportsSend: boolean;
  requiresBridge?: boolean;
}> = {
  gmail: {
    name: 'Gmail',
    icon: 'Mail',
    color: '#EA4335',
    supportsOAuth: true,
    supportsSend: true,
  },
  outlook: {
    name: 'Outlook',
    icon: 'Mail',
    color: '#0078D4',
    supportsOAuth: true,
    supportsSend: true,
  },
  teams: {
    name: 'Microsoft Teams',
    icon: 'Users',
    color: '#6264A7',
    supportsOAuth: true,
    supportsSend: true,
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: 'MessageCircle',
    color: '#25D366',
    supportsOAuth: false,
    supportsSend: true,
    requiresBridge: true,
  },
  telegram: {
    name: 'Telegram',
    icon: 'Send',
    color: '#0088CC',
    supportsOAuth: false,
    supportsSend: true,
  },
  instagram: {
    name: 'Instagram',
    icon: 'Instagram',
    color: '#E4405F',
    supportsOAuth: true,
    supportsSend: true,
    requiresBridge: true,
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'Linkedin',
    color: '#0A66C2',
    supportsOAuth: true,
    supportsSend: false, // Limited API access
    requiresBridge: true,
  },
};
