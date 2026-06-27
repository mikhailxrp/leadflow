"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import type { LeadListItem } from "@/lib/leads/getLeads";
import type { RiskResult } from "@/lib/risk/computeRisk";
import RiskBadge from "@/components/leads/RiskBadge";
import DuplicateBadge from "@/components/leads/DuplicateBadge";
import LeadRowQuickActions from "@/components/leads/LeadRowQuickActions";

const SOURCE_LABELS: Record<string, string> = {
  tilda: "Tilda",
  yandex: "Яндекс Директ",
  wordpress: "WordPress",
  api: "API",
  manual: "Вручную",
  csv: "Импорт",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

interface LeadsTableProps {
  leads: Array<LeadListItem & { risk: RiskResult }>;
}

export default function LeadsTable({ leads }: LeadsTableProps): ReactNode {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[0.5px] border-[var(--color-border)]">
            {[
              "Клиент",
              "Источник",
              "Ответственный",
              "Этап",
              "Риск",
              "Создан",
              "",
            ].map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className="border-b border-[0.5px] border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-surface-2)] transition-colors duration-100"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    {lead.name ?? "—"}
                  </Link>
                  {lead.firstMatchedLeadId && (
                    <DuplicateBadge matchedLeadId={lead.firstMatchedLeadId} />
                  )}
                </div>
                {lead.phone && (
                  <p className="mt-0.5 text-[12px] text-[var(--color-text-tertiary)]">
                    {lead.phone}
                  </p>
                )}
              </td>

              <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                {SOURCE_LABELS[lead.source] ?? lead.source}
              </td>

              <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                {lead.assignedTo?.name ?? (
                  <span className="text-[var(--color-text-tertiary)]">
                    Не назначен
                  </span>
                )}
              </td>

              <td className="px-4 py-3">
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                  style={{ backgroundColor: lead.stage.color }}
                >
                  {lead.stage.name}
                </span>
              </td>

              <td className="px-4 py-3">
                <RiskBadge level={lead.risk.level} reason={lead.risk.reason} />
              </td>

              <td className="px-4 py-3 text-[var(--color-text-tertiary)]">
                {formatDate(lead.createdAt)}
              </td>

              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="leads-open-link text-[var(--color-primary)] hover:underline whitespace-nowrap"
                  >
                    Открыть
                  </Link>
                  <LeadRowQuickActions leadId={lead.id} closeType={lead.closeType} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
