import { useState } from 'react'

function formatDate(value) {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return 'Date unavailable'
  }

  return date.toLocaleString()
}

function ShipmentDetails({
  shipment,
  isLoading,
  error,
  onClose,
  onRetry,
  onAddEvent,
}) {
  const [isSavingEvent, setIsSavingEvent] = useState(false)
  const [eventError, setEventError] = useState('')
  const [defaultEventDate] = useState(() => {
    const date = new Date()
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
    return date.toISOString().slice(0, 16)
  })

  async function handleEventSubmit(event) {
    event.preventDefault()
    setIsSavingEvent(true)
    setEventError('')

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      await onAddEvent(shipment.trackingNumber, {
        stage: formData.get('stage'),
        description: formData.get('description'),
        location: formData.get('location'),
        occurredAt: new Date(formData.get('occurredAt')).toISOString(),
      })
      form.reset()
    } catch (requestError) {
      setEventError(requestError.message || 'Could not save tracking event.')
    } finally {
      setIsSavingEvent(false)
    }
  }

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
          <form className="tracking-event-form" onSubmit={handleEventSubmit}>
            <h3>Add tracking event</h3>
            <div className="tracking-event-fields">
              <label>
                Stage
                <select defaultValue={shipment.currentStage} name="stage" required>
                  <option value="pickup">Pickup</option>
                  <option value="origin_handling">Origin handling</option>
                  <option value="linehaul">Linehaul</option>
                  <option value="customs">Customs</option>
                  <option value="last_mile">Last mile</option>
                  <option value="delivered">Delivered</option>
                </select>
              </label>
              <label>
                Description
                <input
                  autoComplete="off"
                  maxLength="500"
                  name="description"
                  required
                />
              </label>
              <label>
                Location
                <input autoComplete="off" maxLength="120" name="location" />
              </label>
              <label>
                Event date and time
                <input
                  defaultValue={defaultEventDate}
                  name="occurredAt"
                  type="datetime-local"
                  required
                />
              </label>
            </div>
            {eventError && (
              <p className="event-form-error" role="alert">
                {eventError}
              </p>
            )}
            <div className="form-actions">
              <button className="form-submit" disabled={isSavingEvent} type="submit">
                {isSavingEvent ? 'Saving…' : 'Save tracking event'}
              </button>
            </div>
          </form>
        </>
      )}
    </section>
  )
}

export default ShipmentDetails
