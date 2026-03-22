export function Footer() {
  return (
    <div className="flex gap-4 items-center text-xs op-50 hover:op-80 transition-opacity">
      <a href={`${Homepage}/blob/main/LICENSE`} target="_blank" className="hover:text-primary transition-colors">MIT LICENSE</a>
      <span className="flex items-center gap-1">
        <span>NewsNow © 2024-2026 By </span>
        <a href={Author.url} target="_blank" className="hover:text-primary transition-colors font-medium">
          {Author.name}
        </a>
      </span>
    </div>
  )
}
