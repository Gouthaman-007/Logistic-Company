function MetricCard({ label, value, detail, trend, icon }) {
  const trendLabel =
    trend === 'up' || trend === 'down' ? 'positive' : trend

  return (
    <article className={`metric-card${trend === 'warning' ? ' metric-warning' : ''}`}>
      <div className="metric-heading">
        <span>{label}</span>
        <span className="metric-icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="metric-value">{value}</p>
      <p className={`metric-detail ${trendLabel}`}>
        <span aria-hidden="true">
          {trend === 'up' ? '↗' : trend === 'down' ? '↘' : trend === 'warning' ? '↗' : '•'}
        </span>
        {detail}
      </p>
    </article>
  )
}

export default MetricCard
