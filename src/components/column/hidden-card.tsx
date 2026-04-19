import type { SourceID } from "@shared/types"
import { hiddenSourcesAtom } from "~/atoms"
import { sources } from "@shared/sources"

function HiddenCard({ id }: { id: SourceID }) {
  const [, setHiddenSources] = useAtom(hiddenSourcesAtom)
  const source = sources[id]
  const column = source.column || (source.type === "hottest" ? "最热" : source.type === "realtime" ? "实时" : "其他")

  const restore = () => {
    setHiddenSources(prev => prev.filter(s => s !== id))
  }

  return (
    <div className="font-mono text-sm">
      <div className={$(
        "border border-slate-400/30 dark:border-slate-600/30 rounded-lg",
        "bg-slate-800/20 dark:bg-slate-900/20 backdrop-blur-sm",
        "p-3 min-w-[280px] max-w-[320px]",
      )}>
        <div className="flex justify-between items-center mb-1">
          <span className="font-bold text-slate-700 dark:text-slate-200">{source.name}</span>
          <button
            type="button"
            onClick={restore}
            className={$(
              "text-xs px-2 py-0.5 rounded",
              "bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
            )}
          >
            [+]
          </button>
        </div>
        <div className="border-t border-slate-400/20 dark:border-slate-600/20 my-1.5" />
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {source.title || source.type || ""} · {typeof column === "string" ? column : ""}
        </div>
      </div>
    </div>
  )
}

export function HiddenColumn() {
  const hiddenSources = useAtomValue(hiddenSourcesAtom)

  if (hiddenSources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <p className="text-lg">没有隐藏的数据源</p>
        <p className="text-sm mt-2">点击卡片右上角隐藏按钮即可隐藏</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl px-4">
        {hiddenSources.map(id => (
          <HiddenCard key={id} id={id} />
        ))}
      </div>
      <button
        type="button"
        onClick={() => setHiddenSources([])}
        className={$(
          "px-4 py-2 rounded-lg",
          "bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
          "font-mono text-sm",
        )}
      >
        [全部恢复]
      </button>
    </div>
  )
}
