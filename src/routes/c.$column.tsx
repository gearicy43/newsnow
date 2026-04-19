import { createFileRoute, redirect } from "@tanstack/react-router"
import { fixedColumnIds } from "@shared/metadata"
import { Column } from "~/components/column"

export const Route = createFileRoute("/c/$column")({
  component: SectionComponent,
  params: {
    parse: (params) => {
      const column = params.column.toLowerCase()
      // hidden is a special column, allow it
      if (column === "hidden") return { column }
      const found = fixedColumnIds.find(x => x === column)
      if (!found) throw new Error(`"${params.column}" is not a valid column.`)
      return {
        column: found,
      }
    },
    stringify: params => params,
  },
  onError: (error) => {
    if (error?.routerCode === "PARSE_PARAMS") {
      throw redirect({ to: "/" })
    }
  },
})

function SectionComponent() {
  const { column } = Route.useParams()
  return <Column id={column as any} />
}
