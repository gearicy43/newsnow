import type { NewsItem } from "@shared/types"
import { load } from "cheerio"
import dayjs from "dayjs/esm"

const quick = defineSource(async () => {
  const baseURL = "https://www.36kr.com"
  const url = `${baseURL}/newsflashes`
  const response = await myFetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      "Referer": `${baseURL}/`,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    },
  }) as any
  const $ = load(response)
  const news: NewsItem[] = []
  const $items = $(".newsflash-item")
  $items.each((_, el) => {
    const $el = $(el)
    const $a = $el.find("a.item-title")
    const url = $a.attr("href")
    const title = $a.text()
    const relativeDate = $el.find(".time").text()
    if (url && title && relativeDate) {
      news.push({
        url: `${baseURL}${url}`,
        title,
        id: url,
        extra: {
          date: parseRelativeDate(relativeDate, "Asia/Shanghai").valueOf(),
        },
      })
    }
  })

  return news
})

const renqi = defineSource(async () => {
  const baseURL = "https://36kr.com"
  const formatted = dayjs().format("YYYY-MM-DD")

  // 调用官方 API 获取人气榜数据
  const response = await myFetch<any>("https://gateway.36kr.com/api/mis/nav/home/nav/rank/hot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      partner_id: "wap",
      param: {
        siteId: 1,
        platformId: 2,
        hotType: "renqi",
        hotDate: formatted,
        pageSize: 30,
        pageNum: 1,
      },
    }),
  })

  const articles: NewsItem[] = []

  // API 返回的数据结构：response.data.hotRankList
  if (response && response.data && Array.isArray(response.data.hotRankList)) {
    response.data.hotRankList.forEach((item: any) => {
      const material = item.templateMaterial
      if (material) {
        const title = material.widgetTitle || ""
        const route = item.route || ""
        const author = material.authorName || ""
        const viewCount = material.statRead || 0
        const praiseCount = material.statPraise || 0

        if (title && route) {
          articles.push({
            url: `https://www.36kr.com/p/${item.itemId}`,
            title,
            id: String(item.itemId),
            extra: {
              info: `${author}  |  ${viewCount}阅读`,
              hover: `${praiseCount}点赞`,
            },
          })
        }
      }
    })
  }

  return articles
})

export default defineSource({
  "36kr": quick,
  "36kr-quick": quick,
  "36kr-renqi": renqi,
})
