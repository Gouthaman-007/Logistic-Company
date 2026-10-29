function StatusBadge({ status }) {
  const statusClass = status.toLowerCase().replace(' ', '-')

  return <span className={`status-badge ${statusClass}`}>{status}</span>
}

function ShipmentTable({
  shipments,
  search,
  onSearchChange,
  isLoading,
  onAddShipment,
}) {
  return (
    <section className="panel shipments-panel" aria-labelledby="shipments-title">
      <div className="panel-heading shipments-heading">
        <div>
          <h2 id="shipments-title">Exceptions needing attention</h2>
          <p>Prioritized by customer impact and delay risk</p>
        </div>
        <button className="add-shipment-button" type="button" onClick={onAddShipment}>
          <span aria-hidden="true">＋</span>
          Add shipment
        </button>
      </div>

      <div className="table-tools">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <span className="visually-hidden">Search shipments</span>
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search shipments..."
          />
        </label>
        <button className="filter-button" type="button">
          <span aria-hidden="true">☷</span>
          Filters <span className="filter-count">2</span>
        </button>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">Shipment</th>
              <th scope="col">Route</th>
              <th scope="col">ETA</th>
              <th scope="col">Status</th>
              <th scope="col">Stage</th>
              <th scope="col">Carrier</th>
              <th scope="col">Delay</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && shipments.map((shipment) => (
              <tr key={shipment.id}>
                <td className="shipment-cell">
                  <strong>{shipment.id}</strong>
                  <span>{shipment.customer}</span>
                </td>
                <td>{shipment.route}</td>
                <td>{shipment.eta}</td>
                <td>
                  <StatusBadge status={shipment.status} />
                </td>
                <td>{shipment.stage}</td>
                <td>{shipment.carrier}</td>
                <td className={shipment.delay === '—' ? '' : 'delay-cell'}>
                  {shipment.delay}
                </td>
                <td>
                  <button
                    className="row-action"
                    type="button"
                    aria-label={`More actions for ${shipment.id}`}
                  >
                    ···
                  </button>
                </td>
              </tr>
            ))}
            {isLoading && (
              <tr>
                <td className="empty-state" colSpan="8" role="status">
                  Loading shipments…
                </td>
              </tr>
            )}
            {!isLoading && shipments.length === 0 && (
              <tr>
                <td className="empty-state" colSpan="8">
                  No shipments match “{search}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default ShipmentTable
