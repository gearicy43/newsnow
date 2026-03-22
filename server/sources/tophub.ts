import type { NewsItem } from "@shared/types"
import { load } from "cheerio"

export default defineSource(async () => {
  const baseURL = "https://tophub.today"
  const url = `${baseURL}/hot`

  const html = await myFetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
      "Referer": baseURL,
    },
  }) as string

  const $ = load(html)
  const articles: NewsItem[] = []

  // 遍历每个 medium-txt（标题）和对应的 small-txt（来源 + 热度）
  const $mediumItems = $("p.medium-txt")

  $mediumItems.each((index, el) => {
    const $el = $(el)
    const $a = $el.find("a")

    const href = $a.attr("href") || ""
    const title = $a.text().trim()
    const itemId = $a.attr("itemid") || ""

    // 获取对应的 small-txt（下一个 p 标签）
    const $smallTxt = $el.next("p.small-txt")
    const smallText = $smallTxt.text().trim()

    // 解析来源和热度值（格式："知乎 ‧ 1625 万热度" 或 "微博 ‧ 567 万热度"）
    let source = ""
    let hotValue = ""

    if (smallText) {
      const parts = smallText.split("‧").map(s => s.trim())
      if (parts.length >= 1) {
        source = parts[0]
      }
      if (parts.length >= 2) {
        hotValue = parts[1].replace("热度", "").trim()
      }
    }

    if (href && title) {
      articles.push({
        url: href,
        title,
        id: itemId || `tophub-${index}`,
        extra: {
          info: hotValue ? `${hotValue}热度` : "",
          hover: source,
        },
      })
    }
  })

  return articles
})
