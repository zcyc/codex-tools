import { useEffect } from "react";
import { createPortal } from "react-dom";

type AddAccountDialogProps = {
  open: boolean;
  startingAdd: boolean;
  addFlowActive: boolean;
  onClose: () => void;
};

export function AddAccountDialog({
  open,
  startingAdd,
  addFlowActive,
  onClose,
}: AddAccountDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const stageTitle = startingAdd && !addFlowActive ? "正在启动授权流程..." : "正在监听登录状态变化";
  const stageDetail =
    startingAdd && !addFlowActive
      ? "正在打开浏览器并初始化监听，请稍候。"
      : "请在浏览器完成登录授权。授权成功后会自动导入账号并刷新列表（最长 10 分钟）。";

  return createPortal(
    <div className="settingsOverlay" onClick={onClose}>
      <section
        className="settingsDialog addAuthDialog"
        role="dialog"
        aria-modal="true"
        aria-label="添加账号授权"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settingsHeader">
          <div>
            <h2>添加账号</h2>
            <p>浏览器授权完成后会自动写入账号列表。</p>
          </div>
          <button className="iconButton ghost" onClick={onClose} aria-label="关闭弹窗" title="关闭">
            <svg className="iconGlyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="m6 6 12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="addAuthState">
          <div className="addAuthTitleRow">
            <svg
              className="iconGlyph isSpinning addAuthSpinner"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            </svg>
            <strong>{stageTitle}</strong>
          </div>
          <p>{stageDetail}</p>
        </div>

        <div className="updateDialogActions">
          <button className="ghost" onClick={onClose}>
            取消监听
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
