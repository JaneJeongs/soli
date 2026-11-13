"use strict";

const wishlistKinds = ["Outdoor", "Indoor", "Museum", "Art gallery", "Food", "Bakery", "Café", "Brunch", "Restaurant", "Hiking", "Dinner", "Wedding", "Cocktail bar", "Other"];
const indoorKinds = ["Indoor", "Museum", "Art gallery", "Bakery", "Café", "Brunch", "Restaurant"];
const areaKey = area => (area || "").trim().toLowerCase();
function stayFor(trip, day) {
  if (!trip.stays?.length) return trip.hotelName ? {hotel:true,name:trip.hotelName,area:trip.hotelArea} : null;
  const stay = trip.stays.find(stay=>day>=stay.from && day<=stay.through);
  return stay ? {...stay,hotel:true} : null;
}
function travelEstimate(trip, from, to) {
  const a = areaKey(from?.area), b = areaKey(to?.area);
  if (a && a === b) return 15;
  return from?.hotel || to?.hotel ? 40 : 45;
}

const needsChange = place => place.attire === "Dressy" && place.type !== "Cocktail bar";
function draftTrip(trip, dates, weather, makeId) {
  const hotelFor = day => stayFor(trip,day);
  const schedule = Object.fromEntries(dates.map(day => [day, []]));
  const unscheduled = [];
  const wet = day => ["Rain","Snow"].includes(weather[day]?.condition);
  const ordered = list => [...list].sort((a,b) => a.start-b.start);
  const time = (entry, fallback) => entry.fixedTime ? minutes(entry.fixedTime) : fallback;
  function canFit(day, entries) {
    const all = ordered([...schedule[day],...entries]);
    return all.every((entry,index) => {
      const previous = all[index-1];
      const buffer = travelEstimate(trip,previous || hotelFor(day),entry);
      return entry.start >= (previous ? previous.start + previous.duration : 510) + buffer &&
        entry.start + entry.duration <= (entry.type === "Cocktail bar" ? 1440 : 1380);
    });
  }
  const book = (day,entries) => schedule[day].push(...entries);
  const entry = (place,start) => ({...place,start});
  const fixed = place => place.fixedDay && place.fixedTime;
  const bars = trip.wishlist.filter(place => place.type === "Cocktail bar" && !place.fixedTime);
  const paired = new Set();

  for (const place of trip.wishlist.filter(place=>fixed(place)&&!needsChange(place))) {
    if (!schedule[place.fixedDay]) { unscheduled.push(place); continue; }
    book(place.fixedDay,[entry(place,minutes(place.fixedTime))]);
  }

  for (const event of trip.wishlist.filter(needsChange).sort((a,b)=>Number(Boolean(b.fixedDay))-Number(Boolean(a.fixedDay)))) {
    const candidates = [];
    for (const day of dates.filter(day => !event.fixedDay || day===event.fixedDay)) {
      const hotel = hotelFor(day);
      if (!hotel) continue;
      const moveDay = hotel.from===day && trip.stays?.some(stay=>stay.id!==hotel.id && stay.through<day);
      const start = time(event,event.type==="Wedding"?1020:1140);
      const change = {id:makeId(),name:"Return to hotel & change",type:"Hotel change",place:hotel.name,area:hotel.area,hotel:true,duration:45,start:start-travelEstimate(trip,hotel,event)-45};
      const evening = entry(event,start);
      if (!canFit(day,[change,evening])) continue;
      const bar = (["Dinner","Restaurant"].includes(event.type)?bars:[]).filter(place=>!paired.has(place.id)&&(!place.fixedDay||place.fixedDay===day))
        .map(place=>entry(place,start+event.duration+travelEstimate(trip,event,place)))
        .filter(stop=>canFit(day,[change,evening,stop])).sort((a,b)=>a.start-b.start)[0];
      const nearHotel = trip.wishlist.filter(place=>!place.fixedDay && (indoorKinds.includes(place.type)||["Outdoor","Food","Hiking"].includes(place.type)) &&
        travelEstimate(trip,hotel,place)<=25 && (!wet(day) || !["Outdoor","Hiking"].includes(place.type))).length;
      const load = schedule[day].reduce((sum,stop)=>sum+stop.duration,0);
      candidates.push({day,change,evening,bar,score:(bar?40:0)+Math.min(nearHotel,3)*10-load/5+(wet(day)?-12:0)-(moveDay?30:0)-(day===dates[0]||day===dates.at(-1)?4:0)});
    }
    candidates.sort((a,b)=>b.score-a.score);
    const best = candidates[0];
    if (!best) {
      if (fixed(event) && schedule[event.fixedDay]) book(event.fixedDay,[entry(event,minutes(event.fixedTime))]);
      else unscheduled.push(event);
      continue;
    }
    book(best.day,[best.change,best.evening]);
    if (best.bar) {book(best.day,[best.bar]);paired.add(best.bar.id);}
  }

  const flexible = trip.wishlist.filter(place=>!fixed(place)&&!needsChange(place)&&!paired.has(place.id));
  flexible.sort((a,b)=>Number(Boolean(b.fixedDay))-Number(Boolean(a.fixedDay))+
    (Number(indoorKinds.includes(b.type))-Number(indoorKinds.includes(a.type)))*.25 || b.duration-a.duration);
  for (const place of flexible) {
    let best;
    for (const day of dates.filter(day=>!place.fixedDay || day===place.fixedDay)) {
      const plan = schedule[day];
      const change = plan.find(stop=>stop.hotel);
      const daytime = !["Dinner","Cocktail bar"].includes(place.type);
      const commitments = plan.filter(stop=>fixed(stop)||needsChange(stop)||stop.hotel);
      const indoorVisit = indoorKinds.includes(place.type);
      const hotelTravel = travelEstimate(trip,hotelFor(day),place);
      if (change && daytime && plan.filter(stop=>stop.start<change.start&&!stop.hotel).length>=2) continue;
      const begin = place.type==="Dinner"?1080:place.type==="Cocktail bar"?1200:600;
      const end = place.type==="Dinner"?1260:place.type==="Cocktail bar"?1350:1020;
      for (let start=begin;start+ (daytime?place.duration:0)<=end;start+=15) {
        const stop = entry(place,start);
        if (change && daytime && start+place.duration>change.start) continue;
        if (!canFit(day,[stop])) continue;
        if (indoorVisit && commitments.some(booking=>
          start < booking.start + booking.duration + travelEstimate(trip,booking,stop) + 30 &&
          start + stop.duration + travelEstimate(trip,stop,booking) + 30 > booking.start
        )) continue;
        const nearby = plan.some(other=>areaKey(other.area)&&areaKey(other.area)===areaKey(place.area));
        const previous = ordered(plan).filter(other=>other.start<start).at(-1) || hotelFor(day);
        const rainBonus = wet(day)&&indoorVisit&&!commitments.length ? 100 : 0;
        const bookingPenalty = indoorVisit ? 24*commitments.length : 0;
        const score = rainBonus - bookingPenalty -
          (wet(day)&&["Outdoor","Hiking"].includes(place.type)?150:0)+(nearby?18:0)-
          plan.length*10-travelEstimate(trip,previous,place)/3+(change&&daytime?(hotelTravel<=25?10:-25):0)-(start-begin)/90;
        if (!best || score>best.score) best={day,stop,score};
      }
    }
    if (best) book(best.day,[best.stop]);
    else unscheduled.push(place);
  }
  return {schedule,unscheduled};
}

const packingRoles = {
  "Casual top":["Casual top","Clothing"], "Casual bottoms":["Comfortable bottoms","Clothing"],
  "Walking shoes":["Comfortable walking shoes","Shoes"], "Dressy outfit":["Dinner outfit (dress or dressy separates)","Clothing"],
  "Dress shoes":["Heels or dress shoes","Shoes"], "Warm layer":["Warm layer","Clothing"],
  "Rain layer":["Packable rain jacket or umbrella","Other"]
};

function draftPacking(trip, dates, weather, schedule, makeId) {
  const items = trip.items.filter(item=>!item.generated || item.packed).map(item=>({...item}));
  const include = (name,category,role) => {
    const found = items.find(item=>role ? item.role===role : item.name.toLowerCase()===name.toLowerCase());
    if (found) return found.id;
    const prior = trip.items.find(item=>item.generated && item.name===name);
    const item={id:prior?.id||makeId(),name,category,role,generated:true,packed:prior?.packed||false};
    items.push(item);
    return item.id;
  };
  const forRole = role => include(...packingRoles[role],role);
  const tops = [forRole("Casual top")];
  for(let n=2;n<=Math.ceil(dates.length/2);n++) tops.push(include("Casual top "+n,"Clothing"));
  const bottoms = forRole("Casual bottoms");
  const shoes = forRole("Walking shoes");
  include("Underwear × "+(dates.length+1),"Clothing");
  include("Socks × "+dates.length,"Clothing");
  include("Sleepwear","Clothing");
  include("Toiletries","Toiletries");
  include("Phone charger","Tech");
  include("ID and travel documents","Documents");
  const days = Object.fromEntries(dates.map((day,index)=>{
    const w = weather[day];
    const dressy = schedule[day].some(stop=>stop.attire==="Dressy"||stop.type==="Hotel change");
    const outfit = [tops[Math.floor(index/2)],bottoms,shoes];
    if (w?.low<60) outfit.push(forRole("Warm layer"));
    if (["Rain","Snow"].includes(w?.condition)) outfit.push(forRole("Rain layer"));
    return [day,{outfit,evening:dressy?[forRole("Dressy outfit"),forRole("Dress shoes")]:[]}];
  }));
  return {items,days};
}

async function destinationForecast(trip, dates) {
  const now = new Date();
  const first = iso(now);
  now.setDate(now.getDate()+15);
  const last = iso(now);
  if (!dates.some(day=>day>=first&&day<=last)) return {};
  const get = async (url, params) => {
    const response=await fetch(url+"?"+new URLSearchParams(params),{signal:AbortSignal.timeout(7000)});
    if(!response.ok) throw Error("Forecast unavailable");
    return response.json();
  };
  const [city,region] = trip.name.split(",").map(part=>part.trim());
  let place=trip.destination?{latitude:trip.destination.lat,longitude:trip.destination.lon}:null;
  if(!place){
    const locations=await get("https://geocoding-api.open-meteo.com/v1/search",{name:city,count:10,language:"en"});
    place=region?locations.results?.find(item=>[item.country,item.country_code,item.admin1].some(value=>areaKey(value)===areaKey(region))):locations.results?.[0];
  }
  if (!place) return {};
  const {daily} = await get("https://api.open-meteo.com/v1/forecast",{
    latitude:place.latitude,longitude:place.longitude,daily:"weather_code,temperature_2m_max,temperature_2m_min",
    timezone:"auto",temperature_unit:"fahrenheit",forecast_days:16
  });
  return Object.fromEntries((daily?.time??[]).flatMap((day,index)=>{
    const code=daily.weather_code[index], high=daily.temperature_2m_max[index], low=daily.temperature_2m_min[index];
    if (!dates.includes(day)||![code,high,low].every(Number.isFinite)) return [];
    const condition=[71,73,75,77,85,86].includes(code)?"Snow":code>=51?"Rain":code===0?"Sunny":code<=2?"Partly cloudy":"Cloudy";
    return [[day,{condition,high:Math.round(high),low:Math.round(low),source:"forecast",example:false}]];
  }));
}
