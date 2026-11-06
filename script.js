const R=[["Chennai","Pondicherry",150,"3.0",2650,3400],["Chennai","Bangalore",350,"6.0",5650,7400],["Coimbatore","Ooty",90,"2.5",1750,2200],["Chennai","Tirupati",140,"3.5",2500,3200],["Madurai","Rameshwaram",175,"3.5",3025,3900],["Chennai","Vellore",140,"3.0",2500,3200],["Trichy","Thanjavur",60,"1.5",1300,1600],["Chennai","Salem",345,"6.0",5575,7300]];
const V={sedan:["Sedan",15,14],suv:["SUV",20,19],crysta:["Innova Crysta",24,23]};
const $=id=>document.getElementById(id),inr=n=>"₹"+n.toLocaleString("en-IN");
$("routeGrid").innerHTML=R.map((r,i)=>`<div class="route"><h3>${r[0]} → ${r[1]}</h3><small>${r[2]} km · ~${r[3]} hrs</small><p><span>Sedan</span><b>${inr(r[4])}</b></p><p><span>SUV</span><b>${inr(r[5])}</b></p><a class="btn dark" href="#book" data-r="${i}">Book this route</a></div>`).join("");
document.addEventListener("click",e=>{const a=e.target.closest("[data-r]"),p=e.target.closest(".pick");
if(a){const r=R[a.dataset.r];$("from").value=r[0];$("to").value=r[1];est()}
if(p){$("veh").value=p.dataset.v;est()}});
$("svcTabs").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
document.querySelectorAll("#svcTabs button").forEach(x=>x.setAttribute("aria-pressed",x===b));
if(b.dataset.v==="Airport Drop")$("from").placeholder="Chennai Airport";});
function est(){const v=V[$("veh").value],rt=$("mode").value==="Round Trip";$("retWrap").hidden=!rt;
const f=$("from").value.toLowerCase(),t=$("to").value.toLowerCase();
const r=R.find(x=>(f.includes(x[0].toLowerCase())&&t.includes(x[1].toLowerCase()))||(t.includes(x[0].toLowerCase())&&f.includes(x[1].toLowerCase())));
let m=`${rt?"Round trip":"One-way"} at ${inr(rt?v[2]:v[1])}/km + ₹400 driver batta, billed on actual distance.`;
if(r&&!rt){const p=$("veh").value==="sedan"?r[4]:$("veh").value==="suv"?r[5]:r[2]*24;m=`Estimated fare for ${r[2]} km: ${inr(p)}. Tolls, parking and permits extra.`}
if(rt)m+=" 250 km minimum per day.";$("est").textContent=m}
["mode","veh","from","to"].forEach(i=>$(i).addEventListener("input",est));
$("date").min=new Date().toISOString().slice(0,10);
let B=[];try{B=JSON.parse(localStorage.getItem("yzg")||"[]")}catch(e){}
function draw(){$("empty").hidden=B.length>0;$("rows").innerHTML=B.map(b=>`<tr><td>${b.id}</td><td>${b.from}</td><td>${b.to}</td><td>${b.when}</td><td>${b.veh}</td><td><span class="st">Requested</span></td><td><a class="btn dark" style="padding:5px 12px;font-size:12px" target="_blank" rel="noopener" href="${b.wa}">View details</a></td></tr>`).join("")}
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
$("bookForm").addEventListener("submit",e=>{e.preventDefault();
const v=V[$("veh").value],id="YZG-"+Math.floor(10000+Math.random()*90000),d=new Date($("date").value+"T"+$("time").value);
const when=d.toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
const msg=`Hi YazhGo Taxi, booking ${id}\nName: ${$("name").value}\nPhone: ${$("phone").value}\n${$("mode").value}: ${$("from").value} to ${$("to").value}\nDate: ${when}${$("mode").value==="Round Trip"&&$("ret").value?"\nReturn: "+$("ret").value:""}\nVehicle: ${v[0]}`;
const wa="https://wa.me/919489038346?text="+encodeURIComponent(msg);
B.unshift({id,from:esc($("from").value),to:esc($("to").value),when,veh:v[0],wa});
try{localStorage.setItem("yzg",JSON.stringify(B))}catch(x){}
draw();
$("dlgBody").innerHTML=`<p>Booking ID: <b>${id}</b></p><p>Route: <b>${esc($("from").value)} → ${esc($("to").value)}</b></p><p>Date and time: <b>${when}</b></p><p>Vehicle: <b>${v[0]}</b> · ${esc($("mode").value)}</p><p>${esc($("est").textContent)}</p>`;
$("dlgWa").href=wa;dlg.showModal();});
$("msgForm").addEventListener("submit",e=>{e.preventDefault();
open("https://wa.me/919489038346?text="+encodeURIComponent(`Hi YazhGo, I’m ${$("cn").value}. ${$("cm").value}`),"_blank")});
draw();
