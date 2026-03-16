
export type Scout={
userId:string
username:string
boss:string
layer:string
timestamp:number
}

export type State={
boardChannelId?:string
boardMessageId?:string
scouts:Scout[]
}
