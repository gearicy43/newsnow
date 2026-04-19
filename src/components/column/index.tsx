import type { FixedColumnID } from "@shared/types"
import { useTitle } from "react-use"
import { useAtom } from "jotai"
import { useEffect } from "react"
import { NavBar } from "../navbar"
import { Dnd } from "./dnd"
import { HiddenColumn } from "./hidden-card"
import { currentColumnIDAtom } from "~/atoms"
import { metadata } from "@shared/metadata"

type ColumnID = FixedColumnID | "hidden"

export function Column({ id }: { id: ColumnID }) {
  const [currentColumnID, setCurrentColumnID] = useAtom(currentColumnIDAtom)
  useEffect(() => {
    if (id !== "hidden") setCurrentColumnID(id)
  }, [id, setCurrentColumnID])

  useTitle(`NewsNow | ${id === "hidden" ? "隐藏" : metadata[id].name}`)

  if (id === "hidden") return <HiddenColumn />

  return (
    <>
      <div className="flex justify-center md:hidden mb-6">
        <NavBar />
      </div>
      {id === currentColumnID && <Dnd />}
    </>
  )
}
