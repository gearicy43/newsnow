import type { NewsItem, SourceID, SourceResponse } from "@shared/types"
import { useQuery } from "@tanstack/react-query"
import { AnimatePresence, motion, useInView } from "framer-motion"
import { useWindowSize } from "react-use"
import { forwardRef, useImperativeHandle } from "react"
import { OverlayScrollbar } from "../common/overlay-scrollbar"
import { safeParseString } from "~/utils"
import { hiddenSourcesAtom } from "~/atoms"
import { useLogin } from "~/hooks/useLogin"

export interface ItemsProps extends React.HTMLAttributes<HTMLDivElement> {
  id: SourceID
  /**
   * 是否显示透明度，拖动时原卡片的样式
   */
  isDragging?: boolean
  setHandleRef?: (ref: HTMLElement | null) => void
}

interface NewsCardProps {
  id: SourceID
  setHandleRef?: (ref: HTMLElement | null) => void
}

export const CardWrapper = forwardRef<HTMLElement, ItemsProps>(({ id, isDragging, setHandleRef, style, ...props }, dndRef) => {
  const ref = useRef<HTMLDivElement>(null)

  const inView = useInView(ref, {
    once: true,
  })

  useImperativeHandle(dndRef, () => ref.current! as HTMLDivElement)

  return (
    <div
      ref={ref}
      className={$(
        "flex flex-col h-500px rounded-3xl p-5 cursor-default",
        "backdrop-blur-xl backdrop-saturate-150",
        "transition-all duration-500",
        isDragging && "op-40 scale-95",
        `bg-${sources[id].color}-500 dark:bg-${sources[id].color} bg-op-35!`,
        "shadow-2xl shadow-slate-400/30 dark:shadow-slate-900/50",
        "border border-white/30 dark:border-slate-700/30",
      )}
      style={{
        transformOrigin: "50% 50%",
        ...style,
      }}
      {...props}
    >
      {inView && <NewsCard id={id} setHandleRef={setHandleRef} />}
    </div>
  )
})

function NewsCard({ id, setHandleRef }: NewsCardProps) {
  const { refresh } = useRefetch()
  const { loggedIn } = useLogin()
  const [hiddenSources, setHiddenSources] = useAtom(hiddenSourcesAtom)
  const isHidden = hiddenSources.includes(id)
  const { data, isFetching, isError } = useQuery({
    queryKey: ["source", id],
    queryFn: async ({ queryKey }) => {
      const id = queryKey[1] as SourceID
      let url = `/s?id=${id}`
      const headers: Record<string, any> = {}
      if (refetchSources.has(id)) {
        url = `/s?id=${id}&latest`
        const jwt = safeParseString(localStorage.getItem("jwt"))
        if (jwt) headers.Authorization = `Bearer ${jwt}`
        refetchSources.delete(id)
      } else if (cacheSources.has(id)) {
        // wait animation
        await delay(200)
        return cacheSources.get(id)
      }

      const response: SourceResponse = await myFetch(url, {
        headers,
      })

      function diff() {
        try {
          if (response.items && sources[id].type === "hottest" && cacheSources.has(id)) {
            response.items.forEach((item, i) => {
              const o = cacheSources.get(id)!.items.findIndex(k => k.id === item.id)
              item.extra = {
                ...item?.extra,
                diff: o === -1 ? undefined : o - i,
              }
            })
          }
        } catch (e) {
          console.error(e)
        }
      }

      diff()

      cacheSources.set(id, response)
      return response
    },
    placeholderData: prev => prev,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
  })

  const { isFocused, toggleFocus } = useFocusWith(id)

  return (
    <>
      <div className={$("flex justify-between mx-3 mt-1 mb-3 items-center")}>
        <div className="flex gap-2.5 items-center">
          <a
            className={$("w-9 h-9 rounded-xl bg-cover shadow-md shadow-slate-400/20 hover:shadow-lg transition-all duration-300 hover:scale-105")}
            target="_blank"
            href={sources[id].home}
            title={sources[id].desc}
            style={{
              backgroundImage: `url(/icons/${id.split("-")[0]}.png)`,
            }}
          />
          <span className="flex flex-col">
            <span className="flex items-center gap-2">
              <span
                className="text-lg font-bold tracking-tight"
                title={sources[id].desc}
              >
                {sources[id].name}
              </span>
              {sources[id]?.title && <span className={$("text-xs font-medium", `color-${sources[id].color} bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm op-85 px-1.5 py-0.5 rounded-full border border-white/20 dark:border-slate-700/30`)}>{sources[id].title}</span>}
            </span>
            <span className="text-xs op-60"><UpdatedTime isError={isError} updatedTime={data?.updatedTime} /></span>
          </span>
        </div>
        <div className={$("flex gap-2 text-lg", `color-${sources[id].color}`)}>
          <button
            type="button"
            className={$("btn i-ph:arrow-counter-clockwise-duotone hover:rotate-180 transition-transform duration-500", isFetching && "animate-spin i-ph:circle-dashed-duotone")}
            onClick={() => refresh(id)}
          />
          <button
            type="button"
            className={$("btn transition-all duration-300", isFocused ? "i-ph:star-fill text-yellow-500 scale-110" : "i-ph:star-duotone hover:text-yellow-500")}
            onClick={toggleFocus}
          />
          {loggedIn && !isHidden && (
            <button
              type="button"
              className={$("btn i-ph:eye-slash-duotone hover:scale-110 transition-transform")}
              title="隐藏此数据源"
              onClick={() => {
                setHiddenSources(prev => prev.includes(id) ? prev : [...prev, id])
              }}
            />
          )}
          {/* firefox cannot drag a button */}
          {setHandleRef && (
            <div
              ref={setHandleRef}
              className={$("btn", "i-ph:dots-six-vertical-duotone", "cursor-grab active:cursor-grabbing hover:scale-110 transition-transform")}
            />
          )}
        </div>
      </div>

      <OverlayScrollbar
        className={$([
          "h-full p-2.5 overflow-y-auto rounded-2xl bg-white/40 dark:bg-slate-800/40 bg-op-60! backdrop-blur-sm",
          isFetching && `animate-pulse`,
          `sprinkle-${sources[id].color}`,
        ])}
        options={{
          overflow: { x: "hidden" },
        }}
        defer
      >
        <div className={$("transition-opacity-500", isFetching && "op-20")}>
          {!!data?.items?.length && (sources[id].type === "hottest" ? <NewsListHot items={data.items} /> : <NewsListTimeLine items={data.items} />)}
        </div>
      </OverlayScrollbar>
    </>
  )
}

function UpdatedTime({ isError, updatedTime }: { updatedTime: any, isError: boolean }) {
  const relativeTime = useRelativeTime(updatedTime ?? "")
  if (relativeTime) return `${relativeTime}更新`
  if (isError) return "获取失败"
  return "加载中..."
}

function DiffNumber({ diff }: { diff: number }) {
  const [shown, setShown] = useState(true)
  useEffect(() => {
    setShown(true)
    const timer = setTimeout(() => {
      setShown(false)
    }, 5000)
    return () => clearTimeout(timer)
  }, [setShown, diff])

  return (
    <AnimatePresence>
      { shown && (
        <motion.span
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 0.5, y: -7 }}
          exit={{ opacity: 0, y: -15 }}
          className={$("absolute left-0 text-xs", diff < 0 ? "text-green" : "text-red")}
        >
          {diff > 0 ? `+${diff}` : diff}
        </motion.span>
      )}
    </AnimatePresence>
  )
}
function ExtraInfo({ item }: { item: NewsItem }) {
  if (item?.extra?.info) {
    return <>{item.extra.info}</>
  }
  if (item?.extra?.icon) {
    const { url, scale } = typeof item.extra.icon === "string" ? { url: item.extra.icon, scale: undefined } : item.extra.icon
    return (
      <img
        src={url}
        style={{
          transform: `scale(${scale ?? 1})`,
        }}
        className="h-4 inline mt--1"
        referrerPolicy="no-referrer"
        onError={e => e.currentTarget.style.display = "none"}
      />
    )
  }
}

function NewsUpdatedTime({ date }: { date: string | number }) {
  const relativeTime = useRelativeTime(date)
  return <>{relativeTime}</>
}
function NewsListHot({ items }: { items: NewsItem[] }) {
  const { width } = useWindowSize()
  return (
    <ol className="flex flex-col gap-2.5">
      {items?.map((item, i) => (
        <a
          href={width < 768 ? item.mobileUrl || item.url : item.url}
          target="_blank"
          key={item.id}
          title={item.extra?.hover}
          className={$(
            "group flex gap-2.5 items-center relative cursor-pointer [&_*]:cursor-pointer transition-all duration-300",
            "hover:bg-white/50 dark:hover:bg-slate-700/40 rounded-xl px-2 py-1.5 -mx-2",
            "visited:(text-slate-400 dark:text-slate-500)",
          )}
        >
          <span className={$(
            "min-w-6 h-6 flex justify-center items-center rounded-lg text-sm font-semibold",
            i < 3 
              ? "bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-md shadow-primary/30" 
              : "bg-slate-200/70 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300",
          )}>
            {i + 1}
          </span>
          {!!item.extra?.diff && <DiffNumber diff={item.extra.diff} />}
          <span className="flex-1 self-start line-height-none">
            <span className="mr-2 text-[15px] font-medium text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
              {item.title}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 truncate align-middle inline-flex items-center gap-1">
              <ExtraInfo item={item} />
            </span>
          </span>
        </a>
      ))}
    </ol>
  )
}

function NewsListTimeLine({ items }: { items: NewsItem[] }) {
  const { width } = useWindowSize()
  return (
    <ol className="border-s border-slate-300/40 dark:border-slate-600/40 flex flex-col ml-1 gap-3">
      {items?.map(item => (
        <li key={`${item.id}-${item.pubDate || item?.extra?.date || ""}`} className="flex flex-col group">
          <span className="flex items-center gap-2 text-slate-400 dark:text-slate-500 ml-0.5 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></span>
            <span className="font-mono">
              {(item.pubDate || item?.extra?.date) && <NewsUpdatedTime date={(item.pubDate || item?.extra?.date)!} />}
            </span>
            <span className="text-slate-400 dark:text-slate-500">
              <ExtraInfo item={item} />
            </span>
          </span>
          <a
            className={$(
              "ml-3 px-2 py-1.5 hover:bg-white/50 dark:hover:bg-slate-700/40 rounded-xl -mx-2 transition-all duration-300",
              "visited:(text-slate-400 dark:text-slate-500)",
              "text-slate-700 dark:text-slate-200 font-medium",
              "hover:text-slate-900 dark:hover:text-white hover:shadow-sm",
            )}
            href={width < 768 ? item.mobileUrl || item.url : item.url}
            title={item.extra?.hover}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.title}
          </a>
        </li>
      ))}
    </ol>
  )
}
