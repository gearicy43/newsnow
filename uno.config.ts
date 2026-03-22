import { defineConfig, presetIcons, presetWind3, transformerDirectives, transformerVariantGroup } from "unocss"
import { hex2rgba } from "@unocss/rule-utils"
import { sources } from "./shared/sources"

export default defineConfig({
  mergeSelectors: false,
  transformers: [transformerDirectives(), transformerVariantGroup()],
  presets: [
    presetWind3(),
    presetIcons({
      scale: 1.2,
    }),
  ],
  rules: [
    [/^sprinkle-(.+)$/, ([_, d], { theme }) => {
      // @ts-expect-error >_<
      const hex: any = theme.colors?.[d]?.[400]
      if (hex) {
        return {
          "background-image": `radial-gradient(ellipse 80% at 50% -20%,
         rgba(${hex2rgba(hex)?.join(", ")}, 0.25), rgba(255, 255, 255, 0));`,
        }
      }
    }],
    [
      "font-brand",
      {
        "font-family": `"Baloo 2", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, "Noto Sans", sans-serif; `,
      },
    ],
  ],
  shortcuts: {
    "color-base": "color-slate-700 dark:color-slate-200",
    "bg-base": "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800",
    "btn": "op60 hover:op90 cursor-pointer transition-all duration-300 hover:scale-110",
  },
  safelist: [
    ...["orange", ...new Set(Object.values(sources).map(k => k.color))].map(k =>
      `bg-${k} color-${k} border-${k} sprinkle-${k} shadow-${k}
       bg-${k}-500 color-${k}-500
       dark:bg-${k} dark:color-${k}`.trim().split(/\s+/)).flat(),
  ],
  extendTheme: (theme) => {
    // @ts-expect-error >_<
    theme.colors.primary = theme.colors.sky
    return theme
  },
})
