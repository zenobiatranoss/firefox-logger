const state={items:new Map(),selected:null,mode:"detailed",socket:null}

const $=id=>document.getElementById(id)

function statusClass(status){
    if(!status)return""
    if(status>=200&&status<300)return"ok"
    if(status>=300&&status<400)return"redirect"
    if(status>=400)return"error"
    return""
}

function duration(t){
    if(!t.startedAt)return""
    const end=t.completedAt?new Date(t.completedAt):new Date()
    const start=new Date(t.startedAt)
    const ms=end-start
    return Number.isFinite(ms)&&ms>=0?`${ms} ms`:""
}

function bodyValue(value){
    if(value==null)return""
    const raw=value?.raw
    if(raw?.length){
        const bytes=raw.flatMap(x=>Array.isArray(x.bytes)?x.bytes:[])
        if(!bytes.length)return""
        try{
            const text=new TextDecoder().decode(new Uint8Array(bytes))
            try{return JSON.stringify(JSON.parse(text),null,2)}catch{return text}
        }catch{return `[${bytes.length} bytes]`}
    }
    if(value?.formData)return JSON.stringify(value.formData,null,2)
    return typeof value==="string"?value:JSON.stringify(value,null,2)
}

function headersTable(headers){
    if(!Array.isArray(headers)||!headers.length)return"<div class=\"empty\">No headers</div>"
    return `<table>${headers.map(h=>`<tr><td>${escapeHtml(h.name)}</td><td>${escapeHtml(h.value??"")}</td></tr>`).join("")}</table>`
}

function escapeHtml(value){
    return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))
}

function render(){
    const search=$("search").value.toLowerCase()
    const method=$("method").value
    const status=$("status").value
    const items=[...state.items.values()].filter(t=>{
        if(method&&t.method!==method)return false
        if(status&&String(t.statusCode??"")[0]!==status)return false
        const text=`${t.method??""} ${t.url??""} ${t.statusCode??""}`.toLowerCase()
        return !search||text.includes(search)
    })
    $("list").innerHTML=items.map(t=>`
        <div class="row ${state.selected===t.requestId?"selected":""}" data-id="${escapeHtml(t.requestId)}">
            <div class="rowtop">
                <span class="method">${escapeHtml(t.method??"-")}</span>
                <span class="status ${statusClass(t.statusCode)}">${escapeHtml(t.statusCode??t.status)}</span>
                <span class="badge">${escapeHtml(t.resourceType??"")}</span>
                <span class="meta">${escapeHtml(duration(t))}</span>
            </div>
            <div class="url">${escapeHtml(t.url??"")}</div>
        </div>
    `).join("")
    document.querySelectorAll(".row").forEach(row=>row.onclick=()=>{
        state.selected=row.dataset.id
        render()
        renderDetails()
    })
    renderDetails()
}

function renderDetails(){
    const t=state.items.get(state.selected)
    if(!t){$("details").innerHTML='<div class="empty">Select a request</div>';return}
    const requestBody=bodyValue(t.requestData)
    const responseBody=bodyValue(t.responseData)
    $("details").innerHTML=`
        <div class="detail-title">${escapeHtml(t.method??"")} ${escapeHtml(t.url??"")}</div>
        <div class="detail-meta">${escapeHtml(t.status??"")} · ${escapeHtml(t.statusCode??"-")} · ${escapeHtml(duration(t))}</div>
        <div class="block"><h3>Request</h3><pre>${escapeHtml(JSON.stringify({
            requestId:t.requestId,
            resourceType:t.resourceType,
            tabId:t.tabId,
            windowId:t.windowId,
            initiator:t.initiator,
            startedAt:t.startedAt
        },null,2))}</pre></div>
        <div class="block"><h3>Request Headers</h3>${headersTable(t.requestHeaders)}</div>
        <div class="block"><h3>Request Body</h3><pre>${escapeHtml(requestBody||"No body")}</pre></div>
        <div class="block"><h3>Response Headers</h3>${headersTable(t.responseHeaders)}</div>
        <div class="block"><h3>Response Body</h3><pre>${escapeHtml(responseBody||"No body")}</pre></div>
        ${t.error?`<div class="block"><h3>Error</h3><pre>${escapeHtml(t.error)}</pre></div>`:""}
    `
}

async function load(){
    try{
        const r=await fetch("/api/transactions?limit=500&sort=startedAt&order=desc")
        const data=await r.json()
        for(const t of data.transactions??[])state.items.set(t.requestId,t)
        render()
    }catch{}
}

function connect(){
    const protocol=location.protocol==="https:"?"wss":"ws"
    const socket=new WebSocket(`${protocol}://${location.host}`)
    state.socket=socket
    socket.onopen=()=>{
        $("connection").textContent="● Live"
        $("connection").className="live"
    }
    socket.onclose=()=>{
        $("connection").textContent="● Disconnected"
        $("connection").className=""
        setTimeout(connect,1500)
    }
    socket.onerror=()=>socket.close()
    socket.onmessage=e=>{
        try{
            const data=JSON.parse(e.data)
            if(data.type==="connected")return
            if(data.requestId){
                state.items.set(data.requestId,data)
                render()
            }
        }catch{}
    }
}

$("simple").onclick=()=>{
    state.mode="simple"
    $("simple").classList.add("active")
    $("detailed").classList.remove("active")
    $("details").style.display="none"
    document.querySelector("main").style.gridTemplateColumns="1fr"
}
$("detailed").onclick=()=>{
    state.mode="detailed"
    $("detailed").classList.add("active")
    $("simple").classList.remove("active")
    $("details").style.display=""
    document.querySelector("main").style.gridTemplateColumns="46% 54%"
    renderDetails()
}
$("clear").onclick=()=>{
    state.items.clear()
    state.selected=null
    render()
}
$("search").oninput=render
$("method").onchange=render
$("status").onchange=render

load()
connect()
