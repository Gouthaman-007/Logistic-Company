function PageHeading() {
  return (
    <section className="page-heading" id="overview">
      <div>
        <p className="eyebrow">WEDNESDAY, SEPTEMBER 24, 2025</p>
        <h1>
          Good morning, Alex <span aria-hidden="true">✦</span>
        </h1>
        <p className="subheading">
          Here’s what needs your attention across the network.
        </p>
      </div>
      <div className="heading-actions">
        <label className="visually-hidden" htmlFor="report-range">
          Report date range
        </label>
        <select id="report-range" defaultValue="Last 30 days">
          <option>Last 30 days</option>
          <option>Last 7 days</option>
          <option>This quarter</option>
        </select>
        <button className="export-button" type="button">
          <span aria-hidden="true">⇩</span>
          Export report
        </button>
      </div>
    </section>
  )
}

export default PageHeading
