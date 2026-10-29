const navigation = [
  { label: 'Overview', icon: '◫' },
  { label: 'Shipments', icon: '▤' },
  { label: 'Exceptions', icon: '!' , count: 12 },
  { label: 'Carriers', icon: '↔' },
  { label: 'Analytics', icon: '◷' },
]

function Sidebar({ activeItem, onNavigate }) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#overview" aria-label="Haulwise home">
        <span className="brand-mark" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span>haulwise</span>
      </a>

      <p className="workspace-label">OPERATIONS</p>
      <nav className="side-navigation" aria-label="Main navigation">
        {navigation.map((item) => (
          <button
            className={`nav-item${activeItem === item.label ? ' active' : ''}`}
            key={item.label}
            type="button"
            aria-current={activeItem === item.label ? 'page' : undefined}
            onClick={() => onNavigate(item.label)}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span>{item.label}</span>
            {item.count && <span className="nav-count">{item.count}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="nav-item settings-button" type="button">
          <span className="nav-icon" aria-hidden="true">
            ⚙
          </span>
          Settings
        </button>
        <div className="user-card">
          <div className="avatar" aria-hidden="true">
            AS
          </div>
          <div className="user-details">
            <strong>Alex Smith</strong>
            <span>Operations lead</span>
          </div>
          <button className="more-button" type="button" aria-label="User menu">
            ···
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
