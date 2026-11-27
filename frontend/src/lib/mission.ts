export const MISSION_TYPE_LABELS: Record<string, string> = {
  REFERRAL:               "Referral",
  APPLICATION_SUBMISSION: "Application Submission (ដាក់ស្នើឥណទាន)",
  LOAN_APPROVAL:          "Except Loan Offer (ទទួលយកសំណើរឥណទាន)",
  REPAYMENT:              "Repayment (ទូទាត់ប្រាក់)",
  COMPLETE_FORM1:         "Complete Form 1 (បំពេញទម្រង់ប្រវត្តិរូប)",
  COMPLETE_FORM2:         "Complete Form 2 (បំពេញទម្រង់មុខរបរ)",
  COMPLETE_FORM3:         "Complete Form 3 (បំពេញទម្រង់ទំនាក់ទនងបន្ទាន់)",
  COMPLETE_FORM4:         "Complete Form 4 (បំពេញព័ត៌មានឥណទាន)",
};

export function getMissionLabel(type: string): string {
  return MISSION_TYPE_LABELS[type] ?? type;
}
