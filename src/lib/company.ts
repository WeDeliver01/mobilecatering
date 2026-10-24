export interface CompanySettings {
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  vatNumber: string;
  address: string;
  email: string;
  phone: string;
  adminNotifyEmail: string; // where "a quote/booking/payment happened" alerts go
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranchCode: string;
}

// Seeds the settings table and backstops any missing key. The admin fills
// in the real values from Admin > Settings > Business details.
export const DEFAULT_COMPANY: CompanySettings = {
  legalName: "MOSSANNAH",
  tradingName: "Mobile Catering",
  registrationNumber: "",
  vatNumber: "",
  address: "",
  email: "",
  phone: "",
  adminNotifyEmail: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankBranchCode: "",
};

export const COMPANY_SETTINGS_KEYS: Record<keyof CompanySettings, string> = {
  legalName: "company_legal_name",
  tradingName: "company_trading_name",
  registrationNumber: "company_registration_number",
  vatNumber: "company_vat_number",
  address: "company_address",
  email: "company_email",
  phone: "company_phone",
  adminNotifyEmail: "company_admin_notify_email",
  bankName: "bank_name",
  bankAccountName: "bank_account_name",
  bankAccountNumber: "bank_account_number",
  bankBranchCode: "bank_branch_code",
};
