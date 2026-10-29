const bottlenecks = [
  { stage: 'Customs clearance', duration: '1.4 days avg.', share: 42, tone: 'teal' },
  { stage: 'Last mile delivery', duration: '0.8 days avg.', share: 28, tone: 'orange' },
  { stage: 'Linehaul transit', duration: '0.5 days avg.', share: 18, tone: 'gold' },
  { stage: 'Origin handling', duration: '0.3 days avg.', share: 12, tone: 'blue' },
]

function BottleneckPanel() {
  return (
    <article className="panel bottleneck-panel">
      <div className="panel-heading">
        <div>
          <h2>Where work gets stuck</h2>
          <p>Average dwell time by stage</p>
        </div>
        <button className="dots-button" type="button" aria-label="More bottleneck options">
          ···
        </button>
      </div>

      <div className="bottleneck-list">
        {bottlenecks.map((item) => (
          <div className="bottleneck-item" key={item.stage}>
            <div className="bottleneck-copy">
              <strong>{item.stage}</strong>
              <span>{item.duration}</span>
            </div>
            <div
              className="progress-track"
              role="img"
              aria-label={`${item.share}% of delays at ${item.stage}`}
            >
              <span className={`progress-fill ${item.tone}`} style={{ width: `${item.share}%` }} />
            </div>
            <strong className="bottleneck-share">{item.share}%</strong>
          </div>
        ))}
      </div>

      <div className="insight">
        <span aria-hidden="true">✦</span>
        <p>
          <strong>Customs is your biggest lever.</strong> Reducing dwell by 0.5
          days could lift on-time delivery by ~4%.
        </p>
      </div>
    </article>
  )
}

export default BottleneckPanel
