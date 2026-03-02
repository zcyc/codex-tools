import type { AccountSummary } from "../types/app";
import {
  formatPlan,
  formatResetAt,
  formatWindowLabel,
  percent,
  planTone,
  remainingPercent,
  toProgressWidth,
} from "../utils/usage";

type AccountCardProps = {
  account: AccountSummary;
  isSwitching: boolean;
  isDeletePending: boolean;
  switchActionLabel: string;
  onSwitch: (account: AccountSummary) => void;
  onDelete: (account: AccountSummary) => void;
};

export function AccountCard({
  account,
  isSwitching,
  isDeletePending,
  switchActionLabel,
  onSwitch,
  onDelete,
}: AccountCardProps) {
  const usage = account.usage;
  const fiveHour = usage?.fiveHour ?? null;
  const oneWeek = usage?.oneWeek ?? null;
  const normalizedPlan = account.planType || usage?.planType;
  const planLabel = formatPlan(normalizedPlan);
  const tone = planTone(normalizedPlan);

  return (
    <article className={`accountCard tone-${tone} ${account.isCurrent ? "isCurrent" : ""}`}>
      <div className="stamps">
        <span className="stamp stampPlan">{planLabel}</span>
        {account.isCurrent && <span className="stamp stampCurrent">当前</span>}
      </div>
      <button
        className={`cardDeleteIcon ${isDeletePending ? "isPending" : ""}`}
        onClick={() => onDelete(account)}
        aria-label={isDeletePending ? "再次点击确认删除账号" : "删除账号"}
        title={isDeletePending ? "再次点击确认删除" : "删除账号"}
      >
        <svg className="iconGlyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
      <div className="cardHead">
        <div>
          <h3 className={account.isCurrent ? "nameCurrent" : ""}>{account.label}</h3>
        </div>
      </div>

      <div className="usageRow">
        <div className="usageTitle">
          <span>{formatWindowLabel(fiveHour, "5h")}</span>
          <div className="usageStats">
            <strong>已用 {percent(fiveHour?.usedPercent)}</strong>
            <em>剩余 {percent(remainingPercent(fiveHour))}</em>
          </div>
        </div>
        <div className="barTrack">
          <div className="barFill hot" style={{ width: toProgressWidth(fiveHour?.usedPercent) }} />
        </div>
        <small>重置时间：{formatResetAt(fiveHour?.resetAt)}</small>
      </div>

      <div className="usageRow">
        <div className="usageTitle">
          <span>{formatWindowLabel(oneWeek, "1week")}</span>
          <div className="usageStats">
            <strong>已用 {percent(oneWeek?.usedPercent)}</strong>
            <em>剩余 {percent(remainingPercent(oneWeek))}</em>
          </div>
        </div>
        <div className="barTrack">
          <div className="barFill cool" style={{ width: toProgressWidth(oneWeek?.usedPercent) }} />
        </div>
        <small>重置时间：{formatResetAt(oneWeek?.resetAt)}</small>
      </div>

      {usage?.credits && (
        <p className="credits">
          Credits: {usage.credits.unlimited ? "Unlimited" : usage.credits.balance ?? "--"}
        </p>
      )}

      {account.usageError && <p className="errorText">{account.usageError}</p>}

      <div className="cardActions">
        <button
          className="primary cardPrimaryAction"
          onClick={() => onSwitch(account)}
          disabled={isSwitching}
        >
          {isSwitching ? "切换中..." : switchActionLabel}
        </button>
      </div>
    </article>
  );
}
