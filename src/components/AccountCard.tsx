import { useI18n } from "../i18n/I18nProvider";
import type { AccountSummary } from "../types/app";
import {
  formatPlan,
  formatWindowLabel,
  percent,
  planTone,
} from "../utils/usage";

type AccountCardProps = {
  account: AccountSummary;
  isSwitching: boolean;
  isDeletePending: boolean;
  onSwitch: (account: AccountSummary) => void;
  onDelete: (account: AccountSummary) => void;
};

type UsageDialProps = {
  accent: "hot" | "cool";
  centerLabel: string;
  label: string;
  resetTitle: string;
  resetValue: string;
  usedPercent: number | null | undefined;
};

function LaunchIcon({ spinning }: { spinning: boolean }) {
  if (spinning) {
    return (
      <svg
        className="iconGlyph isSpinning"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
    );
  }

  return (
    <svg className="iconGlyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M7 5v14l11-7z" />
    </svg>
  );
}

function UsageDial({
  accent,
  centerLabel,
  label,
  resetTitle,
  resetValue,
  usedPercent,
}: UsageDialProps) {
  const radius = 29;
  const circumference = 2 * Math.PI * radius;
  const normalized =
    usedPercent === undefined || usedPercent === null || Number.isNaN(usedPercent)
      ? 0
      : Math.max(0, Math.min(100, usedPercent));
  const dashOffset = circumference * (1 - normalized / 100);

  return (
    <section className={`usageDial usageDial-${accent}`}>
      <strong className="usageDialLabel">{label}</strong>
      <div className="usageDialChart" aria-hidden="true">
        <svg className="usageDialSvg" viewBox="0 0 84 84">
          <circle className="usageDialTrack" cx="42" cy="42" r={radius} />
          <circle
            className="usageDialProgress"
            cx="42"
            cy="42"
            r={radius}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: dashOffset,
            }}
          />
        </svg>
        <div className="usageDialCenter">
          <strong>{percent(usedPercent)}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>
      <div className="usageDialReset">
        <span>{resetTitle}</span>
        <strong>{resetValue}</strong>
      </div>
    </section>
  );
}

function formatResetValue(epochSec: number | null | undefined, locale?: string) {
  if (!epochSec) {
    return "--";
  }

  const value = new Date(epochSec * 1000);
  return value.toLocaleString(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AccountCard({
  account,
  isSwitching,
  isDeletePending,
  onSwitch,
  onDelete,
}: AccountCardProps) {
  const { copy, locale } = useI18n();
  const usage = account.usage;
  const fiveHour = usage?.fiveHour ?? null;
  const oneWeek = usage?.oneWeek ?? null;
  const normalizedPlan = account.planType || usage?.planType;
  const planLabel = formatPlan(normalizedPlan, copy.accountCard.planLabels);
  const tone = planTone(normalizedPlan);
  const launchLabel = isSwitching ? copy.accountCard.launching : copy.accountCard.launch;
  const fiveHourReset = formatResetValue(fiveHour?.resetAt, locale);
  const oneWeekReset = formatResetValue(oneWeek?.resetAt, locale);

  const handleLaunch = () => {
    if (isSwitching) return;
    onSwitch(account);
  };

  return (
    <article
      className={`accountCard tone-${tone} ${account.isCurrent ? "isCurrent" : ""} ${
        isSwitching ? "isSwitching" : ""
      }`}
    >
      <header className="cardHeader">
        <div className="cardIdentity">
          <div className="cardBadges">
            <span className="cardBadge planBadge">{planLabel}</span>
            {account.isCurrent && (
              <span className="cardBadge currentBadge">
                <span className="cardStatusDot" aria-hidden="true" />
                {copy.accountCard.currentStamp}
              </span>
            )}
          </div>
          <h3 className={account.isCurrent ? "nameCurrent" : ""}>{account.label}</h3>
        </div>
        <button
          className={`cardDeleteIcon ${isDeletePending ? "isPending" : ""}`}
          onClick={() => onDelete(account)}
          aria-label={isDeletePending ? copy.accountCard.deleteConfirm : copy.accountCard.delete}
          title={isDeletePending ? copy.accountCard.deleteConfirm : copy.accountCard.delete}
        >
          <svg className="iconGlyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      </header>

      <div className="usageGrid">
        <UsageDial
          accent="hot"
          centerLabel={copy.accountCard.used}
          label={formatWindowLabel(fiveHour, {
            fallback: copy.accountCard.fiveHourFallback,
            oneWeek: copy.accountCard.oneWeekLabel,
            hourSuffix: copy.accountCard.hourSuffix,
            minuteSuffix: copy.accountCard.minuteSuffix,
          })}
          resetTitle={copy.accountCard.resetAt}
          resetValue={fiveHourReset}
          usedPercent={fiveHour?.usedPercent}
        />
        <UsageDial
          accent="cool"
          centerLabel={copy.accountCard.used}
          label={formatWindowLabel(oneWeek, {
            fallback: copy.accountCard.oneWeekFallback,
            oneWeek: copy.accountCard.oneWeekLabel,
            hourSuffix: copy.accountCard.hourSuffix,
            minuteSuffix: copy.accountCard.minuteSuffix,
          })}
          resetTitle={copy.accountCard.resetAt}
          resetValue={oneWeekReset}
          usedPercent={oneWeek?.usedPercent}
        />
      </div>

      <footer className="cardFooter">
        {account.usageError && <p className="errorText">{account.usageError}</p>}
        <button
          className={`ghost cardLaunchButton ${isSwitching ? "isBusy" : ""}`}
          onClick={handleLaunch}
          disabled={isSwitching}
          aria-label={launchLabel}
          title={isSwitching ? `${copy.accountCard.launching}...` : copy.accountCard.launch}
        >
          <LaunchIcon spinning={isSwitching} />
          <span>{launchLabel}</span>
        </button>
      </footer>
    </article>
  );
}
