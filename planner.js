"use strict";
const minutes = time => {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
};
const clock = minute => [Math.floor(minute / 60), minute % 60].map(part => String(part).padStart(2, "0")).join(":");
const duration = activity => activity.duration ?? (activity.type === "Cocktail bar" ? 60 : 90);
const fits = (activities, start, length, ignore) => start >= 0 && start + length <= 1440 &&
  activities.every(activity => activity.id === ignore || !activity.time ||
    start >= minutes(activity.time) + duration(activity) || start + length <= minutes(activity.time));

function suggestPlan(trip, days, selected) {
  const plans = Object.fromEntries(days.map(day => [day, [...(trip.days[day]?.activities ?? [])]]));
  const changes = [];
  const notes = [];
  const add = (day, activity, start, reason, from) => {
    const updated = {...activity, time: clock(start)};
    if (from) plans[from] = plans[from].filter(entry => entry.id !== activity.id);
    plans[day].push(updated);
    changes.push({day, from, activity: updated, reason});
  };

  const agenda = plans[selected];
  const dinner = agenda.filter(entry => entry.attire === "Dressy" && ["Dinner","Food"].includes(entry.type) && entry.time && minutes(entry.time) >= 960)
    .sort((a,b) => a.time.localeCompare(b.time))[0];
  if (dinner) {
    const prior = agenda.filter(entry => entry.time && minutes(entry.time) < minutes(dinner.time) && entry.type !== "Hotel change");
    const casualDay = prior.some(entry => entry.attire !== "Dressy");
    if (casualDay && !agenda.some(entry => entry.type === "Hotel change" && entry.time && minutes(entry.time) + duration(entry) <= minutes(dinner.time))) {
      const start = minutes(dinner.time) - 90;
      if (trip.days[selected]?.hotel === "Out until dinner") {
        notes.push("Hotel access is marked Out until dinner. Confirm you can return before adding a change stop.");
      } else if (fits(agenda, start, 90)) {
        add(selected, {id:id(), name:"Return to hotel & change", type:"Hotel change", place:trip.hotelName || "Hotel", duration:90}, start,
          "Switch from your day outfit to your dinner outfit. This reserves 30 minutes each way and 30 minutes to change.");
      } else {
        notes.push("There’s no clear 90-minute window before dinner for a hotel stop. Adjust an earlier activity or dinner time.");
      }
    }
    const dinnerEnd = minutes(dinner.time) + duration(dinner);
    const barStart = dinnerEnd + 30;
    const paired = agenda.some(entry => entry.type === "Cocktail bar" && entry.time && minutes(entry.time) >= dinnerEnd);
    if (!paired) {
      const bars = [selected, ...days.filter(day => day !== selected)].flatMap(day =>
        plans[day].filter(entry => entry.type === "Cocktail bar" && entry.flexible).map(entry => ({day, entry})));
      const bar = bars.find(({entry}) => fits(agenda, dinnerEnd, duration(entry) + 30, entry.id));
      if (bar) add(selected, bar.entry, barStart, "Keep your dinner outfit on for cocktails. Includes 30 minutes to get there.", bar.day);
      else if (bars.length) notes.push("There’s no clear slot after dinner for a saved cocktail bar.");
    }
  }

  const rain = day => trip.days[day]?.weather?.condition === "Rain";
  const rainyDays = [selected, ...days.filter(day => day !== selected)].filter(rain);
  const dryDays = days.filter(day => {
    const condition = trip.days[day]?.weather?.condition;
    return condition && condition !== "Rain" && condition !== "Snow";
  });
  for (const from of dryDays) {
    for (const activity of [...plans[from]]) {
      if (!activity.flexible || !["Museum","Art gallery"].includes(activity.type)) continue;
      for (const day of rainyDays) {
        const slots = [];
        const length = duration(activity);
        if (activity.time && minutes(activity.time) >= 600 && minutes(activity.time) + length <= 1020) slots.push(minutes(activity.time));
        for (let start = 600; start + length <= 1020; start += 30) slots.push(start);
        const start = slots.find(time => fits(plans[day], time, length));
        if (start === undefined) continue;
        add(day, activity, start, "Move this indoor visit to a rainy day. Check the venue’s hours before applying.", from);
        break;
      }
    }
  }
  return {changes, notes};
}
