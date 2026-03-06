const supabase = supabase.createClient(
"https://hrcaisojgvuulwubaqez.supabase.co",
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
)

async function login(){

const email=document.getElementById("email").value
const password=document.getElementById("password").value

const {data,error}=await supabase.auth.signInWithPassword({
email:email,
password:password
})

if(error){
alert(error.message)
return
}

document.getElementById("login").style.display="none"
document.getElementById("dashboard").style.display="block"

loadLogs()

}

async function addMoney(){

const title=document.getElementById("title").value
const amount=document.getElementById("amount").value
const type=document.getElementById("type").value

const user=await supabase.auth.getUser()

await supabase
.from("money_logs")
.insert([
{
title:title,
amount:amount,
type:type,
user_id:user.data.user.id
}
])

loadLogs()

}

async function loadLogs(){

const {data}=await supabase
.from("money_logs")
.select("*")
.order("id",{ascending:false})

let html=""

data.forEach(log=>{
html+=`
<div class="log">
${log.title} - $${log.amount} (${log.type})
</div>
`
})

document.getElementById("logs").innerHTML=html

}
