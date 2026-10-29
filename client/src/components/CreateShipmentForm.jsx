import { useState } from 'react'

function CreateShipmentForm({ carriers, onCancel, onSubmit }) {
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const values = {
      trackingNumber: formData.get('trackingNumber'),
      customer: formData.get('customer'),
      route: {
        origin: formData.get('origin'),
        destination: formData.get('destination'),
      },
      carrierId: formData.get('carrierId'),
      estimatedDelivery: new Date(formData.get('estimatedDelivery')).toISOString(),
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
          <h2 id="create-shipment-title">Create shipment</h2>
          <p>Save a shipment and its route to the database.</p>
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
          <label>
            Customer
            <input autoComplete="organization" maxLength="120" name="customer" required />
          </label>
          <label>
            Origin
            <input maxLength="120" name="origin" required />
          </label>
          <label>
            Destination
            <input maxLength="120" name="destination" required />
          </label>
          <label>
            Carrier
            <select defaultValue="" name="carrierId" required>
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
            <input name="estimatedDelivery" type="datetime-local" required />
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
              {isSaving ? 'Saving…' : 'Save shipment'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

export default CreateShipmentForm
