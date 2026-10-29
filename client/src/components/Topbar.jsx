function Topbar({ activeItem }) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Workspace</span>
        <span className="breadcrumb-divider" aria-hidden="true">
          /
        </span>
        <strong>{activeItem}</strong>
      </div>
      <div className="topbar-actions">
        <button className="icon-button notification-button" type="button" aria-label="Notifications">
          ♧<span className="notification-dot" />
        </button>
        <button className="help-button" type="button" aria-label="Help">
          ?
        </button>
      </div>
    </header>
  )
}

export default Topbar
