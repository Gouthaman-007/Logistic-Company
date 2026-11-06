import { useState } from 'react'

function toLocalDateTime(value) {
  const date = new Date(value)

  if (Number.isNaN(date.valueOf())) {
    return ''
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}

function CreateShipmentForm({ carriers, onCancel, onSubmit, shipment = null }) {
  const [isSaving, setIsSaving] = useState(false)
  const isEditing = Boolean(shipment)

  async function handleSubmit(event) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const values = {
      customer: formData.get('customer'),
      route: {
        origin: formData.get('origin'),
        destination: formData.get('destination'),
      },
      carrierId: formData.get('carrierId'),
      estimatedDelivery: new Date(formData.get('estimatedDelivery')).toISOString(),
    }

    if (!isEditing) {
      values.trackingNumber = formData.get('trackingNumber')
    }

    setIsSaving(true)

    try {
      await onSubmit(values)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="panel shipment-form-panel" aria-labelledby="create-shipment-title">
      <div className="panel-heading">
        <div>
          <h2 id="create-shipment-title">
            {isEditing ? `Edit shipment · ${shipment.trackingNumber}` : 'Create shipment'}
          </h2>
          <p>
            {isEditing
              ? 'Update shipment details in the database.'
              : 'Save a shipment and its route to the database.'}
          </p>
        </div>
        <button className="form-cancel" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {carriers.length === 0 ? (
        <p className="form-empty" role="status">
          No active carriers are available. Add a carrier before creating a shipment.
        </p>
      ) : (
        <form className="shipment-form" onSubmit={handleSubmit}>
          {!isEditing && (
            <label>
              Tracking number
              <input
                autoComplete="off"
                maxLength="40"
                minLength="3"
                name="trackingNumber"
                placeholder="SHP-10501"
                required
              />
            </label>
          )}
          <label>
            Customer
            <input
              autoComplete="organization"
              defaultValue={shipment?.customer ?? ''}
              maxLength="120"
              name="customer"
              required
            />
          </label>
          <label>
            Origin
            <input
              defaultValue={shipment?.route.origin ?? ''}
              maxLength="120"
              name="origin"
              required
            />
          </label>
          <label>
            Destination
            <input
              defaultValue={shipment?.route.destination ?? ''}
              maxLength="120"
              name="destination"
              required
            />
          </label>
          <label>
            Carrier
            <select defaultValue={shipment?.carrier?._id ?? ''} name="carrierId" required>
              <option disabled value="">
                Select a carrier
              </option>
              {carriers.map((carrier) => (
                <option key={carrier._id} value={carrier._id}>
                  {carrier.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estimated delivery
            <input
              defaultValue={shipment ? toLocalDateTime(shipment.estimatedDelivery) : ''}
              name="estimatedDelivery"
              type="datetime-local"
              required
            />
          </label>
          <div className="form-actions">
            <button className="form-cancel" type="button" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="form-submit"
              disabled={isSaving || carriers.length === 0}
              type="submit"
            >
              {isSaving ? 'Saving…' : isEditing ? 'Save changes' : 'Save shipment'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default CreateShipmentForm
