export type DepartmentItem = {
  id: string;
  name: string;
};

export type ThreadItem = {
  id: string;
  title: string;
  department_id: string | null;
  is_system_wide: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  latest_message_body: string | null;
  latest_message_at: string | null;
};

export type MessageItem = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
};