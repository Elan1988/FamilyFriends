import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Member = {
  id: string;
  name: string;
  phone: string;
  is_family: boolean;
  shares: number;
  created_at: string;
  password?: string | null;
};

export type Loan = {
  id: string;
  member_id: string;
  amount: number;
  loan_date: string;
  interest_rate: number;
  created_at: string;
};

export const LOAN_INTEREST_RATE = 0.025; // 2.5% per month

export function computeLoanInterest(loan: { amount: number; loan_date: string; interest_rate: number }): {
  months: number;
  interest: number;
  total: number;
} {
  const start = new Date(loan.loan_date);
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  const n = Math.max(0, months);
  const interest = Number(loan.amount) * Number(loan.interest_rate) * n;
  const total = Number(loan.amount) + interest;
  return { months: n, interest, total };
}

export type PaymentType = 'share' | 'ingoboka' | 'amande';

export type Payment = {
  id: string;
  member_id: string;
  month: string; // "YYYY-MM"
  year: number | null;
  type: PaymentType;
  amount: number;
  share_amount: number;
  ingoboka_amount: number;
  penalty_amount: number;
  status: 'yarishyuye' | 'atarishyuye';
  payment_date: string | null;
  created_at: string;
};

export type SocialActivity = {
  id: string;
  activity: string;
  activity_date: string;
  amount: number;
  created_at: string;
};

export type Notification = {
  id: string;
  member_id: string;
  message: string;
  channel: 'sms' | 'message';
  status: 'sent' | 'pending';
  created_at: string;
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  share: 'Share',
  ingoboka: 'Ingoboka',
  amande: 'Amande',
};

export const MONTH_NAMES = [
  'Mutarama', 'Gashyantare', 'Werurwe', 'Kwiakane',
  'Gicurasi', 'Kamena', 'Nyakanga', 'Kanama',
  'Nzeri', 'Ukwakira', 'Ugushyingo', 'Ukuboza',
];

export const SHARE_UNIT_PRICE = 5000;
export const INGOBOKA_FAMILY = 2000;
export const INGOBOKA_NON_FAMILY = 1000;
export const PENALTY_AMOUNT = 2000;
export const PENALTY_DEADLINE_DAY = 5;

export function formatMonthLabel(monthStr: string): string {
  const [year, monthNum] = monthStr.split('-');
  const idx = parseInt(monthNum, 10) - 1;
  return `${MONTH_NAMES[idx] || monthNum} ${year}`;
}

export function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatRwf(amount: number): string {
  return `${Math.round(amount).toLocaleString('en-US')} RWF`;
}

// Expected ingoboka for a member
export function expectedIngoboka(member: Member): number {
  return member.is_family ? INGOBOKA_FAMILY : INGOBOKA_NON_FAMILY;
}

// Expected share amount for a member
export function expectedShareAmount(member: Member): number {
  return member.shares * SHARE_UNIT_PRICE;
}

// Total expected for a member for one month (shares + ingoboka, no penalty)
export function expectedTotal(member: Member): number {
  return expectedShareAmount(member) + expectedIngoboka(member);
}

// Check if a payment record means the member has fully paid for the month
export function isFullyPaid(payment: Payment): boolean {
  return Number(payment.share_amount) > 0 && Number(payment.ingoboka_amount) > 0;
}

// Check if payment is late (after the 6th of the month)
export function isPaymentLate(paymentDate: string | null, month: string): boolean {
  if (!paymentDate) return false;
  const day = parseInt(paymentDate.split('-')[2], 10);
  return day > PENALTY_DEADLINE_DAY;
}

// Compute unpaid amount for a member given their payments for a month
export function computeUnpaidAmount(member: Member, payments: Payment[], month: string): {
  unpaidTotal: number;
  sharePaid: number;
  ingobokaPaid: number;
  penalty: number;
  fullyPaid: boolean;
} {
  const monthPayments = payments.filter(
    (p) => p.member_id === member.id && p.month === month
  );
  const sharePaid = monthPayments.reduce((s, p) => s + Number(p.share_amount), 0);
  const ingobokaPaid = monthPayments.reduce((s, p) => s + Number(p.ingoboka_amount), 0);
  const hasPenalty = monthPayments.some((p) => Number(p.penalty_amount) > 0);

  const expShare = expectedShareAmount(member);
  const expIngoboka = expectedIngoboka(member);
  const fullyPaid = sharePaid >= expShare && ingobokaPaid >= expIngoboka;

  let unpaidTotal = 0;
  if (sharePaid < expShare) unpaidTotal += expShare - sharePaid;
  if (ingobokaPaid < expIngoboka) unpaidTotal += expIngoboka - ingobokaPaid;
  if (!fullyPaid && !hasPenalty) unpaidTotal += PENALTY_AMOUNT;

  return {
    unpaidTotal,
    sharePaid,
    ingobokaPaid,
    penalty: !fullyPaid && !hasPenalty ? PENALTY_AMOUNT : 0,
    fullyPaid,
  };
}
