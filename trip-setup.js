"use strict";

const sampleWishlist = [
  ["Gyeongbokgung Palace","Outdoor","Jongno-gu",120],
  ["Coffee in Anguk","Food","Jongno-gu",60],
  ["National Museum of Korea","Museum","Yongsan-gu",120],
  ["Leeum Museum of Art","Art gallery","Yongsan-gu",90],
  ["Walk along the Han River","Outdoor","Yeouido",120],
  ["Dinner in Euljiro","Dinner","Jung-gu",90,"Dressy"],
  ["Cocktails in Euljiro","Cocktail bar","Jung-gu",60,"Dressy"]
].map(([name,type,area,duration,attire],index)=>({id:"wish-"+index,name,type,area,duration,attire}));

function landingPage(){
  return `<section class="landing" aria-labelledby="landing-title">
    <div class="landing-blob" aria-hidden="true"><img class="landing-eyes" src="landing-eyes.svg" alt="" width="133" height="90"></div>
    <div class="landing-copy">
      <h1 id="landing-title" tabindex="-1">Just you, soli,<br>and somewhere to go.</h1>
      <p>Add the places you want to go. soli turns your wishlist into an itinerary and packing list.</p>
      <div class="landing-actions">
        ${button("Plan a trip <span aria-hidden='true'>→</span>","start-trip","","button primary")}
        ${button("My trips","my-trips","","button")}
      </div>
    </div>
  </section>`;
}

function myTripsPage(){
  const trips=state.trips.filter(trip=>!trip.demo).sort((a,b)=>b.start.localeCompare(a.start));
  return `<section class="my-trips" aria-labelledby="my-trips-title">
    <h1 id="my-trips-title" tabindex="-1">My trips</h1>
    ${trips.length?`<ul class="saved-trips">${trips.map(trip=>`<li>
      <button class="saved-trip" data-action="open-trip" data-value="${esc(trip.id)}">
        <span><strong>${esc(trip.name)}</strong><small>${fmt(trip.start,{month:"short",day:"numeric"})} – ${fmt(trip.end,{month:"short",day:"numeric",year:"numeric"})}</small></span>
        <span aria-hidden="true">→</span>
      </button></li>`).join("")}</ul>`:'<p class="muted">Your saved trips will appear here.</p>'}
    <div class="landing-actions">
      ${button("Plan a trip","start-trip","","button primary")}
      ${state.trips.some(trip=>trip.demo)?button("Explore the Seoul demo","try-demo","","quiet"):""}
    </div>
  </section>`;
}

function startTrip(){
  return `<div class="onboarding">
  <section class="start-panel" aria-labelledby="start-title">
  <h1 id="start-title">Plan a trip</h1>
  <p class="muted">Start with where you’re going and when.</p>
  <form id="start-trip">
    ${placeField("Destination","destination","",true)}
    <div class="form-grid">
    ${field("First day","start","","date","required")}
    ${field("Last day","end","","date","required")}
    </div>
    <details>
      <summary>Add where you’re staying</summary>
      ${placeField("Stay name","stay")}
      <p class="muted">You can add more stays and edit their dates later.</p>
    </details>
    <p class="error" id="start-error" role="alert" hidden></p>
    <div class="onboarding-actions"><button class="button primary" type="submit">Continue to wishlist <span aria-hidden="true">→</span></button>
    </div>
  </form>
  <div class="start-footer">${button("Back to home","cancel-start","","quiet")}
  <small>Place data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a></small></div>
  </section></div>`;
}

function setup(trip) {
  const wish = trip.wishlist ?? [];
  return `<div class="wishlist-layout"><div class="wishlist-intro">
  <h2 id="wishlist-title" tabindex="-1">What’s on your list?</h2>
  <p class="muted">Save the places you want to go. soli will work out the order.</p></div>
  <section>${heading("Places to go",button("+ Add place","wish","",wish.length?"button":"button primary"))}
  ${wish.map(place=>`<div class="row"><div class="copy"><strong>${esc(place.name)}</strong><small>${[place.type,place.location?.address||place.area,place.attire,place.fixedDay,place.fixedTime].filter(Boolean).map(esc).join(" · ")}</small></div>${button("Edit","edit-wish",place.id,"quiet")}</div>`).join("") || '<p class="empty">Add a café, a museum, or anything else you want to do.</p>'}
  </section>
  <details data-wishlist-section="clothes"><summary>Clothes or shoes to bring <small class="muted">· Optional</small></summary><div class="heading">${button("+ Add piece","piece")}</div>
  ${trip.items.filter(item=>item.role&&!item.generated).map(item=>`<div class="row"><div class="copy"><strong>${esc(item.name)}</strong><small>${esc(item.role)}</small></div>${button("Edit","edit-piece",item.id,"quiet")}</div>`).join("") || '<p class="empty">Add anything you already picture wearing. soli fills in the rest.</p>'}
  </details>
  <details data-wishlist-section="stays"><summary>Where you’re staying</summary><div class="heading">${button("+ Add stay","stay")}</div>
  ${(trip.stays??[]).map(stay=>`<div class="row"><div class="copy"><strong>${esc(stay.name)}</strong><small>${[stay.area,fmt(stay.from,{month:"short",day:"numeric"})+" – "+fmt(stay.through,{month:"short",day:"numeric"})].filter(Boolean).map(esc).join(" · ")}</small></div>${button("Edit","edit-stay",stay.id,"quiet")}</div>`).join("") || (trip.hotelName?`<div class="row"><div class="copy">${esc(trip.hotelName)}${trip.hotelArea?" · "+esc(trip.hotelArea):""}</div>${button("Edit","edit-stay","legacy","quiet")}</div>`:'<p class="empty">Add your accommodation and the dates you’ll be based there.</p>')}
  </details>
  <div class="build">
  ${wish.length?button("Build my itinerary","build-trip","","button primary"):""}
  ${!wish.length && trip.demo?button("Load Seoul wishlist","sample-wish"):''}
  </div></div>`;
}

function suggestVenue(name, location, isSeoul) {
  const text=name.toLowerCase().normalize("NFKC");
  const category=location?.category;
  const extra=location?.extra??{};
  const muu=isSeoul && /^(muu(?:\b|$)|무우)/i.test(text);
  const dressy=muu || /fine[ _-]?dining|tasting menu|omakase|한우다이닝/.test(text) ||
    /fine[ _-]?dining|omakase/.test(String(extra.cuisine??"").toLowerCase()) ||
    /^(formal|dressy|smart_casual)$/.test(extra.dress_code??"");
  if(category==="bakery" || /bakery|boulangerie|베이커리|bagel/.test(text)) return {type:"Bakery",attire:"Casual"};
  if(/\bbrunch\b|브런치/.test(text)) return {type:"Brunch",attire:"Casual"};
  if(["trail","trailhead","peak"].includes(category) || /\bhik(e|ing)\b|\btrail\b|등산/.test(text)) return {type:"Hiking",attire:"Casual"};
  if(category==="cafe" || /caf[eé]|coffee|카페/.test(text)) return {type:"Café",attire:"Casual"};
  if(category==="restaurant" || dressy || /\brestaurant\b/.test(text)) return {type:"Restaurant",attire:dressy?"Dressy":""};
  if(category==="museum" || /\bmuseum\b/.test(text)) return {type:"Museum",attire:"Casual"};
  if(category==="gallery" || /\bgallery\b/.test(text)) return {type:"Art gallery",attire:"Casual"};
  if(category==="bar" || /cocktail bar/.test(text)) return {type:"Cocktail bar",attire:""};
  if(/\bwedding\b/.test(text)) return {type:"Wedding",attire:"Dressy"};
  return {type:"",attire:""};
}

function editWish(trip,place) {
  dialog(place?"Edit place":"Add a place",
    placeField("Place or activity","venue",place?.name,true)+
    select("Type","type",["",...wishlistKinds],place?.type)+
    select("Attire","attire",["","Casual","Dressy"],place?.attire)+
    `<details><summary>Reservation or outfit details</summary>`+
    field("Time you’ll spend there (minutes)","duration",place?.duration,"number","min=15 max=480 placeholder=90")+
    field("Reserved date (optional)","fixedDay",place?.fixedDay,"date",`min="${trip.start}" max="${trip.end}"`)+
    field("Reserved time (optional)","fixedTime",place?.fixedTime,"time")+
    "</details>"+(place?'<label class="row"><input type="checkbox" name="remove"> Remove from wishlist</label>':""),
    data=>{
      const values=Object.fromEntries(data);
      if(values.remove) {trip.wishlist=trip.wishlist.filter(item=>item.id!==place.id);return;}
      const name=values.venue.trim();
      if(!name) throw Error("Enter a place or activity.");
      if(values.fixedTime&&!values.fixedDay) throw Error("Choose a date for the reserved time.");
      const selected=$("form").elements.venue.selectedPlace;
      const location=selected??(place?.name===name?place.location:undefined);
      const {type,attire,fixedDay,fixedTime}=values;
      const details={type:type||"Other",attire,fixedDay,fixedTime,name,location,area:location?.area??(place?.name===name?place.area:undefined),
        duration:Number(values.duration)||(values.type==="Cocktail bar"?60:90)};
      if(place) Object.assign(place,details);
      else (trip.wishlist??=[]).push({id:id(),...details});
    });
  const form=$("form");
  const {venue,type,attire}=form.elements;
  const manual=new Set();
  for(const select of [type,attire]) select.addEventListener("change",()=>manual.add(select.name),{once:true});
  const update=()=>{
    const location=venue.selectedPlace;
    const isSeoul=/^seoul(?:\b|$)/i.test(trip.destination?.name||trip.name);
    const suggested=suggestVenue(venue.value,location,isSeoul);
    if(!place || venue.value.trim()!==place.name || location){
      if(!manual.has("type")) type.value=suggested.type;
      if(!manual.has("attire")) attire.value=suggested.attire;
    }
  };
  venue.addEventListener("placechange",update);
  venue.addEventListener("input",update);
}
function editPiece(trip,item) {
  dialog(item?"Edit piece":"Add a piece",field("Piece","name",item?.name,"text","required maxlength=72")+
    select("Use it as","role",Object.keys(packingRoles),item?.role),data=>{
      const {name,role}=Object.fromEntries(data);
      if(!name.trim()) throw Error("Enter the piece you want to bring.");
      const details={name:name.trim(),role,category:packingRoles[role][1]};
      if(item) Object.assign(item,details);
      else trip.items.push({id:id(),packed:false,...details});
    });
}
function loadWishlist(trip) {
  trip.wishlist=structuredClone(sampleWishlist);
  trip.hotelName ||= "Stay in Jongno";
  trip.hotelArea ||= "Jongno-gu";
  const heels=trip.items.find(item=>item.id==="heels");
  if(heels) {heels.name="Black heels";heels.role="Dress shoes";}
  persist();
}
async function buildTrip(trip) {
  if(!trip.stays?.length && !trip.hotelName?.trim()) {editStay(trip);return;}
  if(!trip.wishlist?.length) {tab="setup";render();editWish(trip);return;}
  const control=document.querySelector('[data-action="build-trip"]');
  control.disabled=true;
  control.textContent="Building itinerary…";
  const tripDates=dates(trip);
  const input=JSON.stringify(trip);
  let forecast={};
  try {forecast=await destinationForecast(trip,tripDates);} catch {}
  if(control) {control.disabled=false;control.textContent=tab==="setup"?"Build my itinerary":"Rebuild itinerary";}
  if(active()!==trip || !control?.isConnected || input!==JSON.stringify(trip)) return;
  const weather=Object.fromEntries(tripDates.map(day=>[day,forecast[day]??trip.days[day]?.weather]));
  const {schedule,unscheduled}=draftTrip(trip,tripDates,weather,id);
  const packing=draftPacking(trip,tripDates,weather,schedule,id);
  const missing=tripDates.filter(day=>!weather[day]).length;
  const noStay=tripDates.filter(day=>!stayFor(trip,day));
  const conflicts=tripDates.filter(day=>{
    const timed=[...schedule[day]].sort((a,b)=>a.start-b.start);
    return timed.some((stop,index)=>{
      const previous=timed[index-1];
      return (previous && stop.start<previous.start+previous.duration+travelEstimate(trip,previous,stop)) ||
        (needsChange(stop) && !timed.some(change=>change.hotel&&change.start+change.duration+travelEstimate(trip,change,stop)<=stop.start));
    });
  });
  const brief=tripDates.map(day=>{
    const stops=[...schedule[day]].sort((a,b)=>a.start-b.start);
    return `<div class="row"><div class="copy"><strong>${fmt(day,{weekday:"short",month:"short",day:"numeric"})}${weather[day]?" · "+esc(weather[day].condition):""}</strong><small>${stops.map(stop=>clock(stop.start)+" "+esc(stop.name)+(stop.hotel?" at "+esc(stop.place):"")).join(" → ")||"Open day"}</small></div></div>`;
  }).join("");
  const notes=[
    noStay.length?"Add a stay for "+noStay.map(day=>fmt(day,{month:"short",day:"numeric"})).join(", ")+" to plan hotel stops on those dates.":"",
    missing?`Weather unavailable for ${missing} ${missing===1?"day":"days"}. Add expected conditions in Itinerary and rebuild when you have them.`:"",
    unscheduled.length?"Still on your wishlist: "+unscheduled.map(place=>place.name).join(", ")+".":"",
    conflicts.length?"Check reservation timing or hotel access on "+conflicts.map(day=>fmt(day,{month:"short",day:"numeric"})).join(", ")+".":""
  ].filter(Boolean).map(note=>`<p class="muted">${esc(note)}</p>`).join("");
  const replacing=tripDates.some(day=>trip.days[day]?.activities.length);
  dialog("Your trip draft",brief+notes+`<p class="muted">${packing.items.length} packing items · Travel times are estimates. Check opening hours and routes.</p>`+
    (replacing?'<p class="muted">Applying replaces the itinerary and outfits for these trip dates. Add any reservations you want to keep to the wishlist first.</p>':""),()=>{
      trip.items=packing.items;
      for(const day of tripDates){
        const ordered=[...schedule[day]].sort((a,b)=>a.start-b.start);
        const activities=ordered.map((stop,index)=>({...stop,time:clock(stop.start),travelMinutes:travelEstimate(trip,ordered[index-1]||stayFor(trip,day),stop),flexible:false}));
        Object.assign(editDay(trip,day),packing.days[day],{activities,weather:weather[day]??null});
      }
      trip.unscheduled=unscheduled.map(place=>place.name);
      tab="itinerary";
      selected=tripDates[0];
    },"Apply itinerary");
}

function editStay(trip, stayId) {
  const legacy = trip.hotelName ? {id:"legacy",name:trip.hotelName,area:trip.hotelArea,from:trip.start,through:trip.end} : null;
  const stays = trip.stays ?? (legacy?[legacy]:[]);
  const stay = stays.find(entry=>entry.id===stayId);
  const next = dates(trip).find(day=>!stays.some(entry=>day>=entry.from&&day<=entry.through));
  const bounds = `required min="${trip.start}" max="${trip.end}"`;
  dialog(stay?"Edit stay":"Add a stay",
    placeField("Accommodation","stay",stay?.name,true)+
    field("First day based here","from",stay?.from??next??trip.start,"date",bounds)+
    field("Last day based here","through",stay?.through??trip.end,"date",bounds)+
    (stay?'<label class="row"><input type="checkbox" name="remove"> Remove this stay</label>':""),
    data=>{
      const {stay:name,from,through,remove}=Object.fromEntries(data);
      const location=$("form").elements.stay.selectedPlace??(stay?.name===name.trim()?stay?.location:undefined);
      const rest=stays.filter(entry=>entry.id!==stay?.id);
      if(remove) {trip.stays=rest;trip.hotelName="";trip.hotelArea="";return;}
      if(!name.trim()) throw Error("Enter an accommodation.");
      if(from>through) throw Error("The last day must be on or after the first day.");
      if(rest.some(entry=>from<=entry.through && through>=entry.from)) throw Error("Each day can have one base. Adjust the dates of the other stay first.");
      trip.stays=[...rest,{id:stay?.id??id(),name:name.trim(),area:location?.area??(stay?.name===name.trim()?stay?.area:undefined),location,from,through}].sort((a,b)=>a.from.localeCompare(b.from));
      trip.hotelName="";
      trip.hotelArea="";
    });
}
