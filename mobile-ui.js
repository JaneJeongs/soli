/* Mobile presentation only; the existing planner owns data and actions. */
(() => {
  const mobile = matchMedia('(max-width: 650px)');
  const originalRender = render;
  const originalStartTrip = $('new-trip').onclick;
  const originalDialog = dialog;
  $('new-trip').onclick = function(event) {
    if (!mobile.matches) return originalStartTrip.call(this,event);
    tab='start';
    render();
    const title=document.getElementById('start-title');
    title?.setAttribute('tabindex','-1');
    title?.focus({preventScroll:true});
  };
  dialog = function(...args) {
    const title=document.getElementById('form-title');
    if (mobile.matches) {
      title.setAttribute('tabindex','-1');
      title.setAttribute('autofocus','');
    } else {
      title.removeAttribute('autofocus');
      title.removeAttribute('tabindex');
    }
    return originalDialog(...args);
  };

  const paths = {
    places: '<path d="M12 21s7-6 7-12A7 7 0 0 0 5 9c0 6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.5"/>',
    day: '<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16"/>',
    packing: '<rect x="5" y="7" width="14" height="14" rx="3"/><path d="M9 7V3h6v4M9 10v8m6-8v8"/>',
    stay: '<path d="M3 20V9m18 11V9M3 16h18M5 9h14v7H5zM7 7V5h10v2"/>',
    outfit: '<path d="M10 6a2 2 0 1 1 3 2c-1 .5-1 1-1 2l9 7a1 1 0 0 1-.6 2H3.6a1 1 0 0 1-.6-2l9-7"/>'
  };
  const icon = name => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.places}</svg>`;
  const cityPhoto = trip => /chicago/i.test(trip.name)
    ? 'https://images.unsplash.com/photo-1494522358652-f30e61a60313?auto=format&fit=crop&w=1000&q=85'
    : /seoul/i.test(trip.name) ? 'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=1000&q=85' : '';
  const photo = (trip, cls='') => cityPhoto(trip) ? `<img class="mobile-city-photo ${cls}" src="${cityPhoto(trip)}" alt="${esc(trip.name)} city view" loading="lazy">` : '<div class="mobile-city-photo mobile-city-abstract" aria-hidden="true"></div>';
  const nav = () => `<nav class="mobile-bottom" aria-label="Trip views">${[['setup','Places','places'],['itinerary','Day plan','day'],['packing','Packing','packing']].map(([target,label,symbol])=>`<button data-tab="${target}" aria-pressed="${tab===target || (target==='itinerary' && tab==='today')}">${icon(symbol)}<span>${label}</span></button>`).join('')}</nav>`;
  function mobileLanding() {
    return `<section class="mobile-welcome" aria-labelledby="landing-title">
      <div class="mobile-welcome-copy">
        <h1 id="landing-title" tabindex="-1">Just you, soli,<br>and somewhere<br>to go.</h1>
        <p>Add the places you want to go. soli turns your wishlist into an itinerary and packing list.</p>
      </div>
      <div class="mobile-welcome-actions">
        <button class="button primary" data-action="start-trip">Plan a trip</button>
        <button class="button" data-action="try-demo">Seoul demo</button>
      </div>
      <div class="mobile-welcome-glow" aria-hidden="true">
        <img class="landing-eyes" src="landing-eyes.svg" alt="" width="133" height="90">
      </div>
    </section>`;
  }
  function mobileRender() {
    document.body.classList.toggle('mobile-soli', mobile.matches);
    document.querySelectorAll('.mobile-nav-host').forEach(el=>el.remove());
    document.querySelector('.mobile-menu')?.remove();
    if (!mobile.matches) { document.body.classList.remove('trip-workspace'); return; }
    document.body.classList.toggle('trip-workspace', !['landing','start','my-trips'].includes(tab));
    const trip=active();
    document.body.dataset.mobileView=tab;
    const menu=document.createElement('button');
    menu.className='mobile-menu'; menu.dataset.action='my-trips'; menu.setAttribute('aria-label','View all trips');
    menu.innerHTML='<span></span><span></span><span></span>';
    document.querySelector('.top').append(menu);
    if (tab==='landing') { $('view').innerHTML=mobileLanding(); return; }
    if (tab==='start') return;
    if (tab==='my-trips') return;
    document.body.appendChild(Object.assign(document.createElement('div'),{className:'mobile-nav-host',innerHTML:nav()}));
    // Clear old empty hosts after re-renders.
    document.querySelectorAll('.mobile-nav-host:empty').forEach(el=>el.remove());
    const shown=tab==='today'?todayFor(trip):selected;
    if (['today','itinerary'].includes(tab)) {
      $('hero').innerHTML=`<div class="mobile-day-date"><span>${fmt(shown,{month:'short'})}</span><strong>${fmt(shown,{day:'2-digit'})}</strong><small>${fmt(shown,{year:'numeric'})}</small><p>${fmt(shown,{weekday:'long'})}</p></div><div class="mobile-day-title"><h1>Your day</h1><p>${esc(trip.name)}</p></div>`;
    }
    const tools=document.querySelector('.plan-tools');
    if (tools) {
      const options=document.createElement('details');
      options.className='mobile-plan-options';
      options.innerHTML='<summary>Adjust plan</summary>';
      tools.before(options);
      options.append(tools);
    }
    if (tab==='setup') document.querySelector('.wishlist-intro h2').textContent='Places';
    if (tab==='packing') $('hero').querySelector('h1').textContent='Packing';
  }
  render=function(){ originalRender(); mobileRender(); };
  mobile.addEventListener('change',()=>render());
  render();
})();
