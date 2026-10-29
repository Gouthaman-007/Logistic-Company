import { useEffect, useMemo, useState } from 'react'
import BottleneckPanel from './components/BottleneckPanel'
import CreateShipmentForm from './components/CreateShipmentForm'
import DeliveryPerformance from './components/DeliveryPerformance'
import MetricCard from './components/MetricCard'
import PageHeading from './components/PageHeading'
import Sidebar from './components/Sidebar'
import ShipmentTable from './components/ShipmentTable'
import Topbar from './components/Topbar'
import './App.css'

const metrics = [
  {
    label: 'On-time delivery',
    value: '92.4%',
    detail: '3.2% vs previous period',
    trend: 'up',
    icon: '↗',
  },
  {
    label: 'Shipments in transit',
    value: '1,284',
    detail: '86 arriving today',
    trend: 'neutral',
    icon: '↗',
  },
  {
    label: 'Exceptions to resolve',
    value: '12',
    detail: '4 since yesterday',
    trend: 'warning',
    icon: '!',
  },
  {
    label: 'Avg. transit time',
    value: '2.8 days',
    detail: '0.4 days vs previous period',
    trend: 'down',
    icon: '◷',
  },
]

function formatStatus(status) {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatStage(stage) {
  return stage
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function toShipmentRow(shipment) {
  const eta = new Date(shipment.estimatedDelivery)

  return {
    id: shipment.trackingNumber,
    customer: shipment.customer,
    route: `${shipment.route.origin} → ${shipment.route.destination}`,
    eta: Number.isNaN(eta.valueOf())
      ? 'Not available'
      : eta.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    status: formatStatus(shipment.status),
    stage: formatStage(shipment.currentStage),
    carrier: shipment.carrier?.name ?? 'Unknown carrier',
    delay: shipment.delayHours > 0 ? `${shipment.delayHours}h` : '—',
  }
}

async function fetchDashboardData() {
  const [shipmentResponse, carrierResponse] = await Promise.all([
    fetch('/api/shipments'),
    fetch('/api/carriers'),
  ])
  const [shipmentResult, carrierResult] = await Promise.all([
    shipmentResponse.json(),
    carrierResponse.json(),
  ])

  if (!shipmentResponse.ok) {
    throw new Error(shipmentResult.error || 'Could not load shipments.')
  }

  if (!carrierResponse.ok) {
    throw new Error(carrierResult.error || 'Could not load carriers.')
  }

  return {
    shipments: shipmentResult.data.map(toShipmentRow),
    carriers: carrierResult.data,
  }
}

function App() {
  const [activeItem, setActiveItem] = useState('Overview')
  const [search, setSearch] = useState('')
  const [shipments, setShipments] = useState([])
  const [carriers, setCarriers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function loadDashboardData() {
    setIsLoading(true)
    setError('')

    try {
      const data = await fetchDashboardData()
      setShipments(data.shipments)
      setCarriers(data.carriers)
    } catch (requestError) {
      setError(requestError.message || 'Could not connect to the dashboard API.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    async function loadInitialData() {
      try {
        const data = await fetchDashboardData()

        if (isActive) {
          setShipments(data.shipments)
          setCarriers(data.carriers)
        }
      } catch (requestError) {
        if (isActive) {
          setError(requestError.message || 'Could not connect to the dashboard API.')
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadInitialData()

    return () => {
      isActive = false
    }
  }, [])

  async function createShipment(values) {
    setError('')
    setNotice('')

    try {
      const response = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Could not create shipment.')
      }

      setShipments((current) => [toShipmentRow(result.data), ...current])
      setIsCreateOpen(false)
      setNotice(`Shipment ${result.data.trackingNumber} was saved.`)
    } catch (requestError) {
      setError(requestError.message || 'Could not create shipment.')
    }
  }

  const filteredShipments = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return shipments
    }

    return shipments.filter((shipment) =>
      [
        shipment.id,
        shipment.customer,
        shipment.route,
        shipment.carrier,
        shipment.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [search, shipments])

  return (
    <div className="app-shell">
      <Sidebar activeItem={activeItem} onNavigate={setActiveItem} />
      <main className="main-content">
        <Topbar activeItem={activeItem} />
        <div className="content-wrap">
          <PageHeading />
          {error && (
            <div className="api-alert" role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={loadDashboardData}
              >
                Retry
              </button>
            </div>
          )}
          {notice && (
            <p className="api-notice" role="status">
              {notice}
            </p>
          )}
          <section className="metric-grid" aria-label="Delivery metrics">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>
          <section className="overview-grid" aria-label="Network performance">
            <DeliveryPerformance />
            <BottleneckPanel />
          </section>
          {isCreateOpen && (
            <CreateShipmentForm
              carriers={carriers}
              onCancel={() => setIsCreateOpen(false)}
              onSubmit={createShipment}
            />
          )}
          <ShipmentTable
            shipments={filteredShipments}
            search={search}
            onSearchChange={setSearch}
            isLoading={isLoading}
            onAddShipment={() => {
              setNotice('')
              setIsCreateOpen(true)
            }}
          />
          <footer className="page-footer">
            <span className={`system-status${error ? ' system-error' : ''}`}>
              <i aria-hidden="true" />
              {error ? 'Database connection unavailable' : 'All systems operational'}
            </span>
            <span>{error ? 'Live data unavailable' : 'Live MongoDB data'}</span>
            <a href="mailto:support@haulwise.example">Contact support</a>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
