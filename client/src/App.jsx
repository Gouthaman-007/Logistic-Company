import { useMemo, useState } from 'react'
import BottleneckPanel from './components/BottleneckPanel'
import DeliveryPerformance from './components/DeliveryPerformance'
import MetricCard from './components/MetricCard'
import PageHeading from './components/PageHeading'
import Sidebar from './components/Sidebar'
import ShipmentTable from './components/ShipmentTable'
import Topbar from './components/Topbar'
import { shipments } from './data/shipments'
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

function App() {
  const [activeItem, setActiveItem] = useState('Overview')
  const [search, setSearch] = useState('')

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
  }, [search])

  return (
    <div className="app-shell">
      <Sidebar activeItem={activeItem} onNavigate={setActiveItem} />
      <main className="main-content">
        <Topbar activeItem={activeItem} />
        <div className="content-wrap">
          <PageHeading />
          <section className="metric-grid" aria-label="Delivery metrics">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>
          <section className="overview-grid" aria-label="Network performance">
            <DeliveryPerformance />
            <BottleneckPanel />
          </section>
          <ShipmentTable
            shipments={filteredShipments}
            search={search}
            onSearchChange={setSearch}
          />
          <footer className="page-footer">
            <span className="system-status">
              <i aria-hidden="true" />
              All systems operational
            </span>
            <span>Data synced 4 minutes ago</span>
            <a href="mailto:support@haulwise.example">Contact support</a>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default App
