const navigation = [
  { label: 'Overview', icon: '◫' },
  { label: 'Shipments', icon: '▤' },
  { label: 'Exceptions', icon: '!' , count: 12 },
  { label: 'Carriers', icon: '↔' },
  { label: 'Analytics', icon: '◷' },
]

function Sidebar({ activeItem, onNavigate, onLogout, username }) {
  const initials = username
    .split(/[._-]/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

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
            {initials}
          </div>
          <div className="user-details">
            <strong>{username}</strong>
            <span>Signed in</span>
          </div>
          <button className="sign-out-button" onClick={onLogout} type="button">
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
