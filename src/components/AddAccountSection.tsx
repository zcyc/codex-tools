type AddAccountSectionProps = {
  startingAdd: boolean;
  addFlowActive: boolean;
  onStartAddAccount: () => void;
  onCancelAddFlow: () => void;
};

export function AddAccountSection({
  startingAdd,
  addFlowActive,
  onStartAddAccount,
  onCancelAddFlow,
}: AddAccountSectionProps) {
  return (
    <section className="importBar">
      <div className="importInfo">
        <h2>添加账号</h2>
        <p>授权完成后自动导入并刷新。</p>
      </div>
      <div className="importRow">
        <button
          className="primary"
          onClick={onStartAddAccount}
          disabled={startingAdd || addFlowActive}
        >
          {startingAdd ? "启动中..." : addFlowActive ? "等待授权中..." : "添加账号"}
        </button>
        {addFlowActive && (
          <button className="ghost" onClick={onCancelAddFlow}>
            取消监听
          </button>
        )}
      </div>
      {addFlowActive && <p className="hint importHint">正在监听登录状态变化（最多 10 分钟）。</p>}
    </section>
  );
}
