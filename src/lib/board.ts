
import {EmbedBuilder} from "discord.js"
import {State} from "../types"
import {BOSSES,STALE_MINUTES} from "../config"

export function build(state:State){

 const now=Date.now()

 const scouts=state.scouts.filter(
  s=>now-s.timestamp<STALE_MINUTES*60*1000
 )

 const blocks=BOSSES.map(b=>{

  const list=scouts.filter(s=>s.boss===b)

  if(!list.length)return `**${b}**\nNo scouts`

  const rows=list.map(s=>`• Layer ${s.layer} — <@${s.userId}>`).join("\n")

  return `**${b}**\n${rows}`

 })

 return new EmbedBuilder()
 .setTitle("World Boss Scout Board")
 .setDescription(blocks.join("\n\n"))
 .setColor(0xff9900)
}
