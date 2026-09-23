import { useMemo, useState } from 'react'
import './App.css'

const shipments = [
  { id: 'SHP-10482', customer: 'Northstar Retail', route: 'Rotterdam → Lyon', eta: 'Today, 14:30', status: 'At risk', stage: 'Customs', carrier: 'DHL Freight', delay: '18h' },
  { id: 'SHP-10477', customer: 'Cedar & Co.', route: 'Hamburg → Prague', eta: 'Today, 16:00', status: 'Delayed', stage: 'Linehaul', carrier: 'DB Schenker', delay: '9h' },
  { id: 'SHP-10471', customer: 'Morrow Foods', route: 'Antwerp → Milan', eta: 'Tomorrow, 09:15', status: 'At risk', stage: 'Last mile', carrier: 'Maersk', delay: '6h' },
  { id: 'SHP-10466', customer: 'Atlas Medical', route: 'Le Havre → Berlin', eta: 'Tomorrow, 11:40', status: 'On track', stage: 'Linehaul', carrier: 'Kuehne+Nagel', delay: '—' },
  { id: 'SHP-10459', customer: 'Lumen Hardware', route: 'Rotterdam → Warsaw', eta: 'Sep 26, 08:20', status: 'Delayed', stage: 'Customs', carrier: 'DHL Freight', delay: '31h' },
]
const trend = [62, 68, 64, 73, 70, 76, 72, 81, 78, 84, 80, 87]

function App() {
  const [activeNav, setActiveNav] = useState('Overview')
  const [range, setRange] = useState('Last 30 days')
  const [query, setQuery] = useState('')
  const filteredShipments = useMemo(() => shipments.filter((shipment) => `${shipment.id} ${shipment.customer} ${shipment.route}`.toLowerCase().includes(query.toLowerCase())), [query])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">◒</span><span>haulwise</span></div>
        <div className="workspace-label">OPERATIONS</div>
        <nav>{['Overview', 'Shipments', 'Exceptions', 'Carriers', 'Analytics'].map((item, index) => <button className={activeNav === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setActiveNav(item)}><span className="nav-icon">{['⌂', '▣', '!', '↗', '◔'][index]}</span>{item}{item === 'Exceptions' && <span className="nav-count">12</span>}</button>)}</nav>
        <div className="sidebar-bottom"><button className="nav-item"><span className="nav-icon">⚙</span>Settings</button><div className="user-card"><div className="avatar">AS</div><div><strong>Alex Smith</strong><small>Operations lead</small></div><span className="more">•••</span></div></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{activeNav}</strong></div><div className="top-actions"><button className="icon-button" aria-label="Notifications">♧<i></i></button><button className="help-button">?</button></div></header>
        <div className="content-wrap">
          <section className="page-heading"><div><p className="eyebrow">WEDNESDAY, SEPTEMBER 24, 2025</p><h1>Good morning, Alex <span>✦</span></h1><p className="subheading">Here’s what needs your attention across the network.</p></div><div className="heading-actions"><select value={range} onChange={(event) => setRange(event.target.value)}><option>Last 30 days</option><option>Last 7 days</option><option>This quarter</option></select><button className="export-button">⇩ <span>Export report</span></button></div></section>
          <section className="kpi-grid"><article className="kpi-card"><div className="kpi-head"><span>On-time delivery</span><span className="info">i</span></div><div className="kpi-value">92.4<span>%</span></div><div className="kpi-foot positive">↗ 3.2% <em>vs previous period</em></div></article><article className="kpi-card"><div className="kpi-head"><span>Shipments in transit</span><span className="info">i</span></div><div className="kpi-value">1,284</div><div className="kpi-foot neutral">• 86 arriving today</div></article><article className="kpi-card attention"><div className="kpi-head"><span>Exceptions to resolve</span><span className="info">i</span></div><div className="kpi-value">12</div><div className="kpi-foot warning">↗ 4 <em>since yesterday</em></div></article><article className="kpi-card"><div className="kpi-head"><span>Avg. transit time</span><span className="info">i</span></div><div className="kpi-value">2.8 <span>days</span></div><div className="kpi-foot positive">↘ 0.4 days <em>vs previous period</em></div></article></section>
          <section className="overview-grid"><article className="panel trend-panel"><div className="panel-heading"><div><h2>Delivery performance</h2><p>On-time delivery rate across all shipments</p></div><div className="legend"><span><i className="legend-dot teal"></i>On time</span><span><i className="legend-dot pale"></i>Target</span></div></div><div className="chart-area"><div className="y-axis"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="chart"><div className="target-line"><span>Target 90%</span></div><div className="grid-lines"></div><div className="bars">{trend.map((height, index) => <div className="bar-wrap" key={index}><div className="bar" style={{ height: `${height}%` }}></div><span>{['Aug 01', '', 'Aug 08', '', 'Aug 15', '', 'Aug 22', '', 'Aug 29', '', 'Sep 05', ''][index]}</span></div>)}</div></div></div></article><article className="panel bottleneck-panel"><div className="panel-heading"><div><h2>Where work gets stuck</h2><p>Average dwell time by stage</p></div><button className="dots">•••</button></div><div className="bottleneck-list"><div className="bottleneck-item"><div><strong>Customs clearance</strong><span>1.4 days avg.</span></div><div className="progress"><i style={{ width: '82%' }}></i></div><b>42%</b></div><div className="bottleneck-item"><div><strong>Last mile delivery</strong><span>0.8 days avg.</span></div><div className="progress"><i className="orange" style={{ width: '57%' }}></i></div><b>28%</b></div><div className="bottleneck-item"><div><strong>Linehaul transit</strong><span>0.5 days avg.</span></div><div className="progress"><i className="gold" style={{ width: '38%' }}></i></div><b>18%</b></div><div className="bottleneck-item"><div><strong>Origin handling</strong><span>0.3 days avg.</span></div><div className="progress"><i className="blue" style={{ width: '25%' }}></i></div><b>12%</b></div></div><div className="insight"><span>✦</span><p><strong>Customs is your biggest lever.</strong> Reducing dwell by 0.5 days could lift on-time delivery by ~4%.</p></div></article></section>
          <section className="panel exceptions-panel"><div className="panel-heading"><div><h2>Exceptions needing attention</h2><p>Prioritized by customer impact and delay risk</p></div><button className="view-all">View all exceptions <span>→</span></button></div><div className="table-tools"><label className="search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search shipments..." /></label><button className="filter-button">☷ Filters <span className="filter-count">2</span></button></div><div className="table-wrap"><table><thead><tr><th>SHIPMENT</th><th>ROUTE</th><th>ETA</th><th>STATUS</th><th>STAGE</th><th>CARRIER</th><th>DELAY</th><th></th></tr></thead><tbody>{filteredShipments.map((shipment) => <tr key={shipment.id}><td><strong>{shipment.id}</strong><span>{shipment.customer}</span></td><td>{shipment.route}</td><td>{shipment.eta}</td><td><span className={`status ${shipment.status.toLowerCase().replace(' ', '-')}`}>{shipment.status}</span></td><td>{shipment.stage}</td><td>{shipment.carrier}</td><td className={shipment.delay !== '—' ? 'delay' : ''}>{shipment.delay}</td><td><button className="row-menu">•••</button></td></tr>)}</tbody></table></div></section>
          <footer><span>Data synced 4 minutes ago</span><span className="sync-dot"></span><span>All systems operational</span><span className="footer-right">Need help? <b>Contact support</b></span></footer>
        </div>
      </main>
    </div>
  )
}

export default App
