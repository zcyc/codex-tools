type AddAccountSectionProps = {
  startingAdd: boolean;
  addFlowActive: boolean;
  onStartAddAccount: () => void;
};

export function AddAccountSection({
  startingAdd,
  addFlowActive,
  onStartAddAccount,
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
      </div>
    </section>
  );
}
