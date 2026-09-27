import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface ServiceCardProps {
  title: string;
  mainValue: number | string;
  subText?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  href?: string;
}

function CardContent({
  title,
  mainValue,
  subText,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
}: ServiceCardProps) {
  return (
    <div className="flex items-start gap-3 w-full">
      {/* Icon box */}
      <span
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        <Icon size={20} />
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide truncate mb-0.5">
          {title}
        </p>
        <p
          className="text-2xl font-bold leading-none tabular-nums"
          style={{ color: valueColor }}
        >
          {typeof mainValue === "number"
            ? mainValue.toLocaleString("fr-DZ")
            : mainValue}
        </p>
        {subText && (
          <p className="text-[11px] text-slate-400 mt-1 truncate">{subText}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Statistic tile — a verbatim copy of the DEP frontend's
 * components/dashboard/ServiceCard.tsx, so the dashboards are
 * indistinguishable. Do not restyle it here: change it in DEP first.
 */
export default function ServiceCard(props: ServiceCardProps) {
  const base =
    "bg-white rounded-xl border border-slate-100 shadow-sm p-4 " +
    "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5";

  if (props.href) {
    return (
      <Link href={props.href} className={`${base} block no-underline`}>
        <CardContent {...props} />
      </Link>
    );
  }

  return (
    <div className={base}>
      <CardContent {...props} />
    </div>
  );
}
