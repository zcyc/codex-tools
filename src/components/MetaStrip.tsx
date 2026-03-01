type MetaStripProps = {
  accountCount: number;
  currentCount: number;
};

export function MetaStrip({ accountCount, currentCount }: MetaStripProps) {
  return (
    <section className="metaStrip" aria-label="账号概览">
      <article className="metaPill">
        <span>账号数</span>
        <strong>{accountCount}</strong>
      </article>
      <article className="metaPill">
        <span>当前活跃</span>
        <strong>{currentCount}</strong>
      </article>
    </section>
  );
}
