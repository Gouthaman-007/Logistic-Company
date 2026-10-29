function formatDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return 'Date unavailable'
  }

  return date.toLocaleString()
}

function ShipmentDetails({ shipment, isLoading, error, onClose, onRetry }) {
  return (
    <section
      className="panel shipment-details-panel"
      aria-labelledby="shipment-details-title"
      aria-live="polite"
    >
      <div className="panel-heading">
        <div>
          <h2 id="shipment-details-title">
            Shipment details
            {shipment && ` · ${shipment.trackingNumber}`}
          </h2>
          <p>Shipment record retrieved from the database.</p>
        </div>
        <button className="form-cancel" type="button" onClick={onClose}>
          Close
        </button>
      </div>

      {isLoading && <p className="details-message">Loading shipment details…</p>}
      {error && (
        <div className="details-error" role="alert">
          <span>{error}</span>
          <button className="form-cancel" type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
      {shipment && !isLoading && (
        <>
          <dl className="shipment-details-grid">
            <div>
              <dt>Customer</dt>
              <dd>{shipment.customer}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>
                {shipment.route.origin} → {shipment.route.destination}
              </dd>
            </div>
            <div>
              <dt>Carrier</dt>
              <dd>{shipment.carrier?.name ?? 'Unknown carrier'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{shipment.status.replaceAll('_', ' ')}</dd>
            </div>
            <div>
              <dt>Current stage</dt>
              <dd>{shipment.currentStage.replaceAll('_', ' ')}</dd>
            </div>
            <div>
              <dt>Estimated delivery</dt>
              <dd>{formatDate(shipment.estimatedDelivery)}</dd>
            </div>
            {shipment.carrier?.contactEmail && (
              <div>
                <dt>Carrier contact</dt>
                <dd>{shipment.carrier.contactEmail}</dd>
              </div>
            )}
          </dl>
          <div className="tracking-events">
            <h3>Tracking events</h3>
            {shipment.trackingEvents.length ? (
              <ol>
                {shipment.trackingEvents.map((event, index) => (
                  <li key={`${event.stage}-${event.occurredAt}-${index}`}>
                    <strong>{event.stage.replaceAll('_', ' ')}</strong>
                    <span>{event.description}</span>
                    {event.location && <span>{event.location}</span>}
                    <time dateTime={event.occurredAt}>
                      {formatDate(event.occurredAt)}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No tracking events have been recorded yet.</p>
            )}
          </div>
        </>
      )}
    </section>
  )
}

export default ShipmentDetails
