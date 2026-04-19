import { fixedColumnIds, metadata } from "@shared/metadata"
import { Link } from "@tanstack/react-router"
import { currentColumnIDAtom, hiddenSourcesAtom } from "~/atoms"
import { useLogin } from "~/hooks/useLogin"

export function NavBar() {
  const currentId = useAtomValue(currentColumnIDAtom)
  const { toggle } = useSearchBar()
  const loggedIn = useLogin()
  const hiddenSources = useAtomValue(hiddenSourcesAtom)
  return (
    <span className={$([
      "flex p-1.5 pr-2 rounded-full bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl",
      "shadow-lg shadow-slate-300/50 dark:shadow-slate-900/50 border border-white/20 dark:border-slate-700/30",
      "text-sm gap-0.5",
    ])}
    >
      <button
        type="button"
        onClick={() => toggle(true)}
        className={$(
          "px-3 py-1.5 hover:(bg-primary/15 rounded-full) op-60 dark:op-75",
          "cursor-pointer transition-all duration-300",
        )}
      >
        更多
      </button>
      {fixedColumnIds.map(columnId => (
        <Link
          key={columnId}
          to="/c/$column"
          params={{ column: columnId }}
          className={$(
            "px-3 py-1.5 hover:(bg-primary/15 rounded-full) cursor-pointer transition-all duration-300",
            currentId === columnId 
              ? "color-primary font-semibold bg-primary/10 rounded-full shadow-sm" 
              : "op-60 dark:op-75 hover:op-80",
          )}
        >
          {metadata[columnId].name}
        </Link>
      ))}
      {loggedIn && hiddenSources.length > 0 && (
        <Link
          to="/c/$column"
          params={{ column: "hidden" }}
          className={$(
            "px-3 py-1.5 hover:(bg-primary/15 rounded-full) cursor-pointer transition-all duration-300",
            (currentId as any) === "hidden"
              ? "color-primary font-semibold bg-primary/10 rounded-full shadow-sm"
              : "op-60 dark:op-75 hover:op-80",
          )}
        >
          隐藏 ({hiddenSources.length})
        </Link>
      )}
    </span>
  )
}
