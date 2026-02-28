export type DepartmentItem = {
  id: string;
  name: string;
};

export type PublisherProfile = {
  full_name: string;
  role: string;
  department_memberships?: { departments: { code: string } | null }[];
};

export type AnnouncementItem = {
  id: string;
  title: string;
  priority: "normal" | "urgent" | "critical";
  is_system_wide: boolean;
  created_at: string;
  memo_file_name: string | null;
  memo_mime_type: string | null;
  memo_file_size_bytes: number | null;
  profiles?: PublisherProfile | null;
};

export type AnnouncementDetail = AnnouncementItem & {
  content: string;
  expires_at: string | null;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type AnnouncementsResponse = {
  data: AnnouncementItem[];
  pagination: Pagination;
};

export type ViewState = "list" | "detail" | "create";