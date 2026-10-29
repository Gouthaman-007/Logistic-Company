const performance = [62, 68, 64, 73, 70, 76, 72, 81, 78, 84, 80, 87]
const dateLabels = ['Aug 01', '', 'Aug 08', '', 'Aug 15', '', 'Aug 22', '', 'Aug 29', '', 'Sep 05', '']

function DeliveryPerformance() {
  return (
    <article className="panel trend-panel">
      <div className="panel-heading">
        <div>
          <h2>Delivery performance</h2>
          <p>On-time delivery rate across all shipments</p>
        </div>
        <div className="chart-legend">
          <span>
            <i className="legend-dot teal" />
            On time
          </span>
          <span>
            <i className="legend-dot target" />
            Target
          </span>
        </div>
      </div>

      <div className="chart-area" role="img" aria-label="On-time delivery trend rises from 62% to 87% across the last twelve weeks. Target is 90%.">
        <div className="y-axis" aria-hidden="true">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>
        <div className="chart">
          <div className="chart-grid" aria-hidden="true" />
          <div className="target-line" aria-hidden="true">
            <span>Target 90%</span>
          </div>
          <div className="bars">
            {performance.map((value, index) => (
              <div className="bar-column" key={`${dateLabels[index]}-${index}`}>
                <div
                  className="performance-bar"
                  style={{ height: `${value}%` }}
                  title={`${value}% on-time delivery`}
                />
                <span>{dateLabels[index]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

export default DeliveryPerformance
