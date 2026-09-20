import { create } from "zustand";
import { persist } from "zustand/middleware";

// อ้างอิงจาก issue_category_enum ใน AI Assistant Q&A Guideline — Lukchang Move
export const CATEGORY_LABELS_TH: Record<string, string> = {
  refund: "ขอคืนเงิน",
  driver_delay: "คนขับสาย/ไม่มารับ",
  payment: "สถานะการชำระเงิน",
  pricing: "ราคาไม่ตรงกับที่ประเมิน",
  coupon_promo: "คูปอง/โปรโมชั่น",
  driver_behavior: "พฤติกรรมคนขับ",
  damaged_parcel: "พัสดุเสียหาย/สูญหาย",
  address_issue: "ที่อยู่/จุดหมายผิดพลาด",
  proof_of_delivery: "หลักฐานการส่งมอบ",
  account_data_edit: "แก้ไขข้อมูลบัญชี",
  rating_dispute: "ข้อพิพาทเรื่องคะแนน",
  earnings_dispute: "ข้อพิพาทเรื่องรายได้",
  payout_delay: "เงินโอนล่าช้า",
  fee_dispute: "ค่าธรรมเนียมผิดปกติ",
  kyc_issue: "ปัญหา KYC",
  navigation_mapping: "ระบบนำทาง/จับคู่งาน",
  app_technical: "ปัญหาทางเทคนิคของแอป",
  accident: "อุบัติเหตุระหว่างทำงาน",
  vehicle_issue: "รถเสีย/ขับต่อไม่ได้",
  account_security: "ความปลอดภัยของบัญชี",
  fraud_report: "แจ้งเหตุฉ้อโกง/เรียกเก็บเงินนอกระบบ",
  legal_emergency: "เหตุฉุกเฉิน/ความปลอดภัย/กฎหมาย",
  pdpa_request: "คำขอเกี่ยวกับข้อมูลส่วนบุคคล (PDPA)",
  inappropriate_content: "เนื้อหา/ข้อความไม่เหมาะสม",
  general: "เรื่องทั่วไปอื่นๆ",
};

export type IssueCategory = keyof typeof CATEGORY_LABELS_TH;

export const ISSUE_CATEGORIES = Object.keys(CATEGORY_LABELS_TH) as IssueCategory[];

// Tier ตาม guideline: 2A = AI เปิด ticket และปิดจบเอง, 2B = AI เปิด ticket รอ Admin ตรวจสอบ,
// 3 = escalate ให้ Admin ทันที (ผูกกับหัวข้อ), 3-N = escalate ทันทีจากพฤติกรรม/สัญญาณระหว่างบทสนทนา
export const TICKET_TIERS = ["2A", "2B", "3", "3-N"] as const;
export type TicketTier = (typeof TICKET_TIERS)[number];

export type SupportTicket = {
  id: string;
  createdAt: string;
  orderId: string;
  category: IssueCategory;
  description: string;
  tier: TicketTier;
  status: "รอดำเนินการ";
};

type TicketStore = {
  tickets: SupportTicket[];
  addTicket: (
    ticket: Omit<SupportTicket, "id" | "createdAt" | "status">,
  ) => SupportTicket;
};

export const useTicketStore = create<TicketStore>()(
  persist(
    (set, get) => ({
      tickets: [],
      addTicket: (input) => {
        const category: IssueCategory = ISSUE_CATEGORIES.includes(input.category)
          ? input.category
          : "general";
        const tier: TicketTier = TICKET_TIERS.includes(input.tier) ? input.tier : "2B";
        const ticket: SupportTicket = {
          id: `LCM-${Date.now().toString(36).toUpperCase()}`,
          createdAt: new Date().toISOString(),
          orderId: input.orderId.trim() || "ไม่ระบุ",
          category,
          description: input.description.trim(),
          tier,
          status: "รอดำเนินการ",
        };
        set({ tickets: [ticket, ...get().tickets] });
        return ticket;
      },
    }),
    { name: "lukchangmove-tickets" },
  ),
);

const TICKET_BLOCK =
  /TICKET_CREATED\s*\nOrder ID:\s*(.+)\nCategory:\s*(.+)\nDescription:\s*([\s\S]+?)\nTier:\s*(.+)\nStatus:\s*(.+)/i;

export function parseTicketBlock(text: string): {
  visible: string;
  ticket: Omit<SupportTicket, "id" | "createdAt" | "status"> | null;
} {
  const match = text.match(TICKET_BLOCK);
  if (!match) return { visible: text, ticket: null };

  const visible = text.replace(match[0], "").trim();
  return {
    visible: visible || "บันทึกเรื่องของคุณไว้ในระบบแล้วค่ะ ทีมงานจะดำเนินการตรวจสอบต่อไป",
    ticket: {
      orderId: match[1].trim(),
      category: match[2].trim() as IssueCategory,
      description: match[3].trim(),
      tier: match[4].trim() as TicketTier,
    },
  };
}
