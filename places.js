"use strict";

const placeCache = new Map();
function placeField(label, name, value="", required=false) {
  return `<div class="place-field"><label>${label}
    <input name="${name}" value="${esc(value)}" maxlength="100" autocomplete="off"
      role="combobox" aria-autocomplete="list" aria-expanded="false" data-place="${name}" ${required?"required":""}>
    </label><ul class="place-results" role="listbox" id="places-${name}" hidden></ul>
    <small class="muted" role="status"></small></div>`;
}

const normalizePlace = value => (value??"").trim().toLowerCase();
const knownDestinations = {
  "seoul":{lat:37.5665,lon:126.978,countryCode:"KR"},
  "san diego":{lat:32.7157,lon:-117.1611,countryCode:"US"}
};

async function tripSearchLocation(trip) {
  if(trip.destination?.countryCode) return trip.destination;
  if(trip.demo && trip.id.startsWith("seoul")) return knownDestinations.seoul;
  const [city,...regions]=trip.name.split(",").map(normalizePlace);
  const known=knownDestinations[city];
  if(known && (!regions.length || regions.every(region=>(city==="seoul"?["south korea","republic of korea","korea","kr"]:["california","ca","united states","us","usa"]).includes(region)))) return known;
  const matches=await searchPlaces(trip.destination?.name||trip.name,null,"destination");
  return matches.find(match=>match.countryCode && normalizePlace(match.name)===city &&
    regions.every(region=>[match.region,match.country,match.countryCode].some(value=>normalizePlace(value)===region)));
}
function nearbyRank(place,destination) {
  const longitude=(place.lon-destination.lon)*Math.cos(destination.lat*Math.PI/180);
  return Math.hypot(place.lat-destination.lat,longitude)<=0.3 ? 0 : 1;
}

async function searchPlaces(query, destination, kind) {
  const params = new URLSearchParams({q:query,limit:"8",lang:"en"});
  if (kind==="destination") params.set("layer","city");
  else if(kind==="stay") for(const type of ["hotel","motel","guest_house","hostel","apartment","resort","chalet"]) params.append("osm_tag","tourism:"+type);
  if (kind!=="destination" && destination) {
    params.set("lat",destination.lat);
    params.set("lon",destination.lon);
    params.set("location_bias_scale","0.15");
    if(destination.countryCode) params.set("countrycode",destination.countryCode);
  }
  const key=params.toString();
  if(placeCache.has(key)) return placeCache.get(key);
  const response=await fetch("https://photon.komoot.io/api/?"+key,{signal:AbortSignal.timeout(6000)});
  if(!response.ok) throw Error("Place search unavailable");
  const data=await response.json();
  const results=(data.features??[]).flatMap(({properties:p,geometry})=>{
    if(!p?.name || !Array.isArray(geometry?.coordinates)) return [];
    const [lon,lat]=geometry.coordinates;
    if(![lat,lon].every(Number.isFinite)) return [];
    const countryCode=p.countrycode?.toUpperCase();
    if(kind!=="destination" && destination?.countryCode && countryCode!==destination.countryCode) return [];
    const area=p.district||p.locality||p.city||"";
    const street=[p.housenumber,p.street].filter(Boolean).join(" ");
    const address=[...new Set([street,p.district,p.city,p.state,p.postcode,p.country].filter(value=>value&&value!==p.name))].join(", ");
    const detail=kind==="destination"?[p.state,p.country].filter(value=>value&&value!==p.name).join(", "):address;
    return [{name:p.name,label:[p.name,detail].filter(Boolean).join(", "),detail,address,area,lat,lon,category:p.osm_value,extra:p.extra,countryCode,country:p.country,region:p.state}];
  }).filter((entry,index,all)=>all.findIndex(other=>other.label===entry.label)===index);
  if(kind!=="destination" && destination) results.sort((a,b)=>nearbyRank(a,destination)-nearbyRank(b,destination));
  if(placeCache.size>=100) placeCache.delete(placeCache.keys().next().value);
  placeCache.set(key,results);
  return results;
}

function connectPlaces(container, destination) {
  for(const input of container.querySelectorAll("[data-place]")){
    const field=input.closest(".place-field"), list=field.querySelector("ul"), status=field.querySelector("[role=status]");
    const kind=input.dataset.place;
    let timer, sequence=0, options=[], current=-1;
    input.setAttribute("aria-controls",list.id);
    function close(){
      clearTimeout(timer);
      sequence++;
      list.hidden=true;
      input.setAttribute("aria-expanded","false");
      input.removeAttribute("aria-activedescendant");
      current=-1;
    }
    function choose(option){
      input.value=kind==="destination"?option.label:option.name;
      input.selectedPlace=option;
      close();
      status.textContent=option.detail;
      input.dispatchEvent(new Event("placechange",{bubbles:true}));
    }
    input.addEventListener("input",()=>{
      input.selectedPlace=null;
      close();
      status.textContent="";
      const query=input.value.trim();
      if(query.length<3 || input.matches(":disabled")) return;
      const request=sequence;
      timer=setTimeout(async()=>{
        status.textContent="Searching…";
        try{
          const location=kind==="destination"?null:await destination();
          if(request!==sequence || !input.isConnected) return;
          if(kind==="venue" && !location?.countryCode){
            status.textContent="Select a city in Edit trip to search nearby, or keep the name you typed.";
            return;
          }
          const matches=await searchPlaces(query,location,kind);
          if(request!==sequence || !input.isConnected) return;
          options=matches;
          status.textContent=options.length?"":"No matches. You can keep the name you typed.";
          list.innerHTML=options.map((option,index)=>`<li id="${list.id}-${index}" role="option" aria-selected="false"><strong>${esc(option.name)}</strong><small>${esc(option.detail)}</small></li>`).join("");
          list.hidden=!options.length;
          input.setAttribute("aria-expanded",String(Boolean(options.length)));
        }catch{
          if(request===sequence) status.textContent="Search is unavailable. You can keep the name you typed.";
        }
      },350);
    });
    list.addEventListener("pointerdown",event=>event.preventDefault());
    list.addEventListener("click",event=>{
      const option=event.target.closest('[role="option"]');
      if(option) choose(options[[...list.children].indexOf(option)]);
    });
    input.addEventListener("keydown",event=>{
      if(event.key==="Escape" && !list.hidden){event.preventDefault();event.stopPropagation();close();return;}
      if(list.hidden) return;
      if(event.key==="ArrowDown" || event.key==="ArrowUp"){
        event.preventDefault();
        current=current<0?(event.key==="ArrowDown"?0:options.length-1):(current+(event.key==="ArrowDown"?1:-1)+options.length)%options.length;
        [...list.children].forEach((option,index)=>option.setAttribute("aria-selected",String(index===current)));
        input.setAttribute("aria-activedescendant",list.children[current].id);
        list.children[current].scrollIntoView({block:"nearest"});
      }
      if(event.key==="Enter" && current>=0){event.preventDefault();choose(options[current]);}
    });
    input.addEventListener("blur",()=>{close();if(status.textContent==="Searching…") status.textContent="";});
  }
}
