import { Menu, Bell, User } from 'lucide-react'

const Header = () => {
  return (
    <header className="navbar bg-base-100 shadow-sm">
      <div className="flex-none lg:hidden">
        <label htmlFor="drawer-toggle" className="btn btn-square btn-ghost">
          <Menu className="w-6 h-6" />
        </label>
      </div>
      <div className="flex-1">
        <h1 className="text-xl font-semibold">Pharmacy Admin Dashboard</h1>
      </div>
      <div className="flex-none gap-2">
        <button className="btn btn-ghost btn-circle">
          <Bell className="w-6 h-6" />
        </button>
        <div className="dropdown dropdown-end">
          <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
            <User className="w-6 h-6" />
          </div>
          <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
            <li><a>Profile</a></li>
            <li><a>Settings</a></li>
            <li><a>Logout</a></li>
          </ul>
        </div>
      </div>
    </header>
  )
}

export default Header
