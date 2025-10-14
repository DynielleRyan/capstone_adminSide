export default function Header() {
  return (
    <div className="flex justify-between items-center p-4 bg-base-100 shadow-sm ml-100 ">
      <input
        type="text"
        placeholder="Search here..."
        className="input input-bordered w-80"
      />
      <div className="flex gap-4 items-center">
        <button className="btn btn-ghost btn-circle">🔔</button>
        <div className="flex items-center gap-2">
          <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
            A
          </div>
          <span className="font-semibold">Admin</span>
        </div>
      </div>
    </div>
  );
}
