/** 네이티브 딥링크가 해석하는 FCM data 계약. */
export type PushCustomData =
  | { kind: 'book_created'; bookId: number; profileId: number }
  | { kind: 'weekly_report'; bookId?: never; profileId?: number }
  | { kind: 'iap_purchase'; bookId?: never; profileId?: number }
  | { kind: 'admin_message'; bookId?: number; profileId?: number };
